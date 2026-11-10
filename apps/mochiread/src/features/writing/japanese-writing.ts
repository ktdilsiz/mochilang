import { Platform } from 'react-native';
import characters from '../../data/japanese-writing-index.json';

type StrokeData = { strokes: string[]; medians: number[][][] };
const supported = new Set([...characters]);
const cache = new Map<string, Promise<Record<string, StrokeData>>>();

export function japaneseWritingCharacters(word: string) {
  return [...word.normalize('NFKC')].filter((char) => supported.has(char));
}

export async function loadJapaneseStrokes(char: string): Promise<StrokeData> {
  const shard = (char.codePointAt(0)! >> 8).toString(16);
  let pending = cache.get(shard);
  if (!pending) {
    pending = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const base = Platform.OS === 'web' ? './writing/ja' : 'https://ktdilsiz.github.io/mochilang/writing/ja';
        const response = await fetch(`${base}/${shard}.json`, { signal: controller.signal });
        if (!response.ok) throw new Error('Japanese stroke data unavailable');
        return await response.json() as Record<string, StrokeData>;
      } finally { clearTimeout(timer); }
    })();
    cache.set(shard, pending);
    pending.catch(() => { cache.delete(shard); });
  }
  const data = (await pending)[char];
  if (!data) throw new Error('No Japanese stroke data for this character');
  return data;
}
