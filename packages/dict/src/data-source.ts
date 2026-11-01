import { gunzipSync, strFromU8 } from 'fflate';

export function getChineseData(): Record<string, string[]>[] {
  return [require('./data/dict-0.json'), require('./data/dict-1.json'), require('./data/dict-2.json'), require('./data/dict-3.json')];
}

export function getJapaneseRows(): unknown[] {
  const { compressed } = require('./data/japanese.json') as { compressed: string };
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new Uint8Array(Math.floor(compressed.length * 3 / 4) - (compressed.endsWith('==') ? 2 : compressed.endsWith('=') ? 1 : 0));
  let buffer = 0, bits = 0, offset = 0;
  for (let i = 0; i < compressed.length && compressed[i] !== '='; i++) {
    buffer = (buffer << 6) | alphabet.indexOf(compressed[i]);
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes[offset++] = (buffer >> bits) & 255; }
  }
  return JSON.parse(strFromU8(gunzipSync(bytes)));
}

export function getBilingualData(pair: string): Record<string, string[]> | null {
  switch (pair) {
    case 'en-tr': return require('./data/bilingual/en-tr.json');
    case 'es-en': return require('./data/bilingual/es-en.json');
    case 'en-es': return require('./data/bilingual/en-es.json');
    case 'en-zh': return require('./data/bilingual/en-zh.json');
    default: return null;
  }
}

// Bundled data remains synchronous in native apps and the other web app.
export async function prepareDictionary(_language: 'ja' | 'zh'): Promise<void> {}
export function getChineseDecomposition(): unknown { return {}; }
