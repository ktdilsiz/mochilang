import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const shared = path.resolve(root, '../../packages/dict/src/data');
const output = path.join(root, 'public/dictionaries');
mkdirSync(output, { recursive: true });
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const data = {
  ja: Buffer.from(read(path.join(shared, 'japanese.json')).compressed, 'base64'),
  zh: gzipSync(JSON.stringify({ dictionaries: [0, 1, 2, 3].map((i) => read(path.join(shared, `dict-${i}.json`))), decomposition: read(path.join(root, 'src/data/decomp.json')) }), { level: 9 }),
};
const manifest = {};
for (const [language, bytes] of Object.entries(data)) {
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const filename = `${language}-${hash}.json.gz`;
  writeFileSync(path.join(output, filename), bytes);
  manifest[language] = filename;
  console.log(`${language}: ${(bytes.length / 1024 / 1024).toFixed(2)} MB, downloaded only when selected`);
}
for (const file of readdirSync(output)) {
  if (/^(ja|zh)-[a-f0-9]{16}\.json\.gz$/.test(file) && !Object.values(manifest).includes(file)) unlinkSync(path.join(output, file));
}
writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest) + '\n');
writeFileSync(path.join(output, 'NOTICE.txt'), 'Japanese dictionary: JMdict © EDRDG, CC BY-SA 4.0; see https://github.com/ktdilsiz/mochilang/blob/main/apps/mochiread/JMDICT-NOTICE.md\nChinese dictionary: CC-CEDICT, CC BY-SA 4.0; see https://github.com/ktdilsiz/mochilang/blob/main/apps/mochiread/CC-CEDICT-NOTICE.md\nCharacter decomposition: Make Me a Hanzi, LGPL / Arphic Public License; see https://github.com/skishore/makemeahanzi\nThese are existing bundled datasets, repackaged for on-demand web downloads.\n');
