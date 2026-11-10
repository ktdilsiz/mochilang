// Node-only source access for asset builders. Apps never reach into src/data.
import { readFileSync } from 'node:fs';
const read = (name) => JSON.parse(readFileSync(new URL(`./data/${name}`, import.meta.url), 'utf8'));
export const readChineseDictionaries = () => [0, 1, 2, 3].map((i) => read(`dict-${i}.json`));
export const readCompressedJapanese = () => Buffer.from(read('japanese.json').compressed, 'base64');

export const readCompressedSpanish = () => Buffer.from(read('spanish.json').compressed, 'base64');
