import data from '../data/decomp.json';
import { lookup } from './dict';
import { isCJK } from './segment';
import { pinyin } from 'pinyin-pro';

export type DecompEntry = {
  pinyin: string;
  definition: string;
  components: string[];
  raw?: string;
};

const DECOMP = data as Record<string, DecompEntry>;

export function getDecomp(char: string): DecompEntry | null {
  return DECOMP[char] ?? null;
}

export type ExploreItem = {
  char: string;
  pinyin: string;
  meanings: string[];
  components: string[];
};

/**
 * Build the data shown in the Explore modal for a given char or word.
 *
 * - Multi-character words: components are the individual characters that make
 *   up the word, so users can drill into each.
 * - Single character: components come from the IDS decomposition (forest 林 →
 *   wood 木 + wood 木).
 * - When CC-CEDICT has no entry, falls back to the gloss from the
 *   decomposition dataset so single chars still show *something*.
 */
export function buildExploreItem(input: string): ExploreItem {
  const py = pinyin(input, { toneType: 'symbol', type: 'string' }).replace(
    /\s+/g,
    ''
  );

  const dictEntry = lookup(input);
  let meanings = dictEntry?.meanings ?? [];

  let components: string[] = [];
  if ([...input].length > 1) {
    components = [...input].filter((ch) => isCJK(ch));
  } else {
    const decomp = getDecomp(input);
    if (decomp) {
      components = decomp.components.filter((ch) => isCJK(ch));
      if (meanings.length === 0 && decomp.definition) {
        meanings = [decomp.definition];
      }
    }
  }

  components = components.filter((ch) => ch !== input);

  return { char: input, pinyin: py, meanings, components };
}

export function hasExploreData(input: string): boolean {
  if ([...input].some((ch) => isCJK(ch) && ch !== input)) return true;
  const decomp = getDecomp(input);
  return !!decomp && decomp.components.some((ch) => ch !== input && isCJK(ch));
}
