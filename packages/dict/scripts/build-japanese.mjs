import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

// Pin the dataset so a clean rebuild is reproducible. Use the common-word
// edition to keep offline mobile startup/memory bounded.
const release = '3.6.2+20261019180022';
const name = `jmdict-eng-common-${release}.json`;
const url = `https://github.com/scriptin/jmdict-simplified/releases/download/${encodeURIComponent(release)}/${encodeURIComponent(name)}.tgz`;
const temporary = await mkdtemp(join(tmpdir(), 'mochiread-jmdict-'));
execFileSync('curl', ['-fL', '--retry', '2', url, '-o', join(temporary, 'source.tgz')], { stdio: 'inherit' });
execFileSync('tar', ['-xzf', join(temporary, 'source.tgz'), '-C', temporary]);
const members = execFileSync('tar', ['-tzf', join(temporary, 'source.tgz')], { encoding: 'utf8' }).trim().split('\n');
const jsonFile = members.find((member) => member.endsWith('.json'));
if (!jsonFile) throw new Error('JMdict archive contains no JSON dataset');
const source = JSON.parse(await readFile(join(temporary, jsonFile), 'utf8'));
const rows = [];
for (const word of source.words) {
  for (const form of [...word.kanji.map((k) => k.text), ...word.kana.map((k) => k.text)]) {
    for (const kana of word.kana) {
      if (kana.appliesToKanji && !kana.appliesToKanji.includes('*') && !kana.appliesToKanji.includes(form) && form !== kana.text) continue;
      if (word.kana.some((k) => k.text === form) && form !== kana.text) continue;
      const senses = word.sense.filter((s) =>
        (s.appliesToKanji.includes('*') || s.appliesToKanji.includes(form) || form === kana.text) &&
        (s.appliesToKana.includes('*') || s.appliesToKana.includes(kana.text))
      );
      const meanings = [...new Set(senses.flatMap((s) => s.gloss.filter((g) => g.lang === 'eng').map((g) => g.text)))];
      const pos = [...new Set(senses.flatMap((s) => s.partOfSpeech))];
      if (meanings.length) rows.push({
        value: [form, kana.text, meanings, pos],
        // Prefer a common reading of the entry's primary spelling over an
        // alternate spelling of another entry (本: ほん before 元/本: もと).
        priority: (word.kanji[0]?.text === form ? 2 : 0) + (kana.common ? 2 : 0),
      });
    }
  }
}
const output = new URL('../src/data/japanese.json', import.meta.url);
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
rows.sort((a, b) => b.priority - a.priority);
await writeFile(output, JSON.stringify(rows.map((row) => row.value)));
console.log(`Built ${rows.length} Japanese spelling/reading entries from JMdict ${release}.`);
