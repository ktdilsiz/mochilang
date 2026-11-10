import type { LibraryEntry } from './schema';
import { HSK3_SENTENCES } from '../data/hsk3-sentences';
import { HSK4_SENTENCES } from '../data/hsk4-sentences';

export const ORIGINAL_SEED_IDS = ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5'];

/**
 * Seed IDs we used to introduce but no longer want in the library. On
 * hydration we strip these from any existing library so users who already
 * received them get the cleanup automatically.
 */
export const DEPRECATED_SEED_IDS = [
  'seed-2',
  'seed-3',
  'seed-4',
  'seed-5',
  'seed-hsk3-1',
  'seed-hsk3-2',
  'seed-hsk3-3',
  'seed-hsk3-4',
  'seed-hsk3-5',
  'seed-hsk3-6',
  'seed-hsk3-7',
  'seed-hsk3-8',
  'seed-hsk3-9',
  'seed-hsk3-10',
];


export const SEED_LIBRARY: LibraryEntry[] = (() => {
  const now = Date.now();
  const items: Array<Omit<LibraryEntry, 'id' | 'createdAt'>> = [
    {
      title: 'Greeting',
      text: '你好，世界！我喜欢吃苹果。今天天气很好。',
      language: 'zh',
    },
  ];
  const baseSeeds = items.map((item, i) => ({
    id: `seed-${i + 1}`,
    title: item.title,
    text: item.text,
    language: item.language,
    createdAt: now - i * 60_000,
  }));

  const hsk3All: LibraryEntry = {
    id: 'seed-hsk3-all',
    title: `HSK 3 · 300 example sentences`,
    text: HSK3_SENTENCES.join('\n'),
    language: 'zh',
    createdAt: now - (items.length + 1) * 60_000,
  };

  const hsk4All: LibraryEntry = {
    id: 'seed-hsk4-all',
    title: `HSK 4 · 600 example sentences`,
    text: HSK4_SENTENCES.join('\n'),
    language: 'zh',
    createdAt: now - (items.length + 2) * 60_000,
  };

  const japaneseWelcome: LibraryEntry = {
    id: 'seed-ja-1',
    title: 'Japanese welcome',
    text: 'こんにちは、世界！私は日本語を勉強しています。今日はいい天気です。',
    language: 'ja',
    createdAt: now - (items.length + 3) * 60_000,
  };

  return [...baseSeeds, japaneseWelcome, hsk3All, hsk4All, { id: 'seed-es-1', title: 'Spanish welcome', text: '¡Hola! Me llamo Ana. Vivo en una casa cerca del parque. Estoy aprendiendo español y leo un libro cada día.', language: 'es', createdAt: now - 600000 }];
})();
