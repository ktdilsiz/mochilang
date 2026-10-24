import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

// Pin the full English edition. Store senses once per entry rather than
// duplicating them for every spelling/reading combination.
const release = '3.6.2+20261019180022';
const name = `jmdict-eng-${release}.json`;
const url = `https://github.com/scriptin/jmdict-simplified/releases/download/${encodeURIComponent(release)}/${encodeURIComponent(name)}.tgz`;
const temporary = await mkdtemp(join(tmpdir(), 'mochiread-jmdict-'));
execFileSync('curl', ['-fL', '--retry', '2', url, '-o', join(temporary, 'source.tgz')], { stdio: 'inherit' });
const members = execFileSync('tar', ['-tzf', join(temporary, 'source.tgz')], { encoding: 'utf8' }).trim().split('\n');
const jsonFile = members.find((member) => member.endsWith('.json'));
if (!jsonFile || jsonFile.includes('/') || jsonFile.includes('..')) throw new Error('Unexpected JMdict archive');
execFileSync('tar', ['-xzf', join(temporary, 'source.tgz'), '-C', temporary, jsonFile]);
const source = JSON.parse(await readFile(join(temporary, jsonFile), 'utf8'));
const entries = [];
for (const word of source.words) {
  let inheritedPos = [];
  const senses = word.sense.map((sense) => {
    if (sense.partOfSpeech.length) inheritedPos = sense.partOfSpeech;
    return [inheritedPos, sense.gloss.filter((g) => g.lang === 'eng').map((g) => g.text), sense.appliesToKanji, sense.appliesToKana];
  }).filter((sense) => sense[1].length);
  if (!senses.length) continue;
  const forms = word.kanji.map((kanji, i) => [
    kanji.text,
    word.kana.filter((kana) => kana.appliesToKanji.includes('*') || kana.appliesToKanji.includes(kanji.text)).map((kana) => kana.text),
    (kanji.common ? 8 : 0) + (i === 0 ? 2 : 0),
  ]);
  for (const kana of word.kana) forms.push([kana.text, [kana.text], kana.common ? 8 : 0]);
  entries.push([word.id, forms.filter((form) => form[1].length), senses]);
}
const output = new URL('../src/data/japanese.json', import.meta.url);
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
const compressed = gzipSync(JSON.stringify(entries), { level: 9 }).toString('base64');
await writeFile(output, JSON.stringify({ release, compressed }));
console.log(`Built ${entries.length} Japanese entries with separate senses/readings from JMdict ${release}.`);
