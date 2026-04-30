import data from '../data/dict.json';

export type Definition = {
  word: string;
  meanings: string[];
};

const DICT = data as Record<string, string[]>;

export function lookup(word: string): Definition | null {
  const meanings = DICT[word];
  if (!meanings) return null;
  return { word, meanings };
}
