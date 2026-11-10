import { getSpanishRows } from './data-source';
import type { Token } from './core';
export type SpanishRow = [string, string[], string[]];
export type SpanishDefinition = { word: string; meanings: string[]; lemmas: string[] };
export const normalizeSpanish = (word: string) => word.normalize('NFC').toLocaleLowerCase('es');
let entries: Map<string, SpanishRow> | undefined;
export function lookupSpanish(word: string): SpanishDefinition | null {
  entries ??= new Map((getSpanishRows() as SpanishRow[]).map((row) => [row[0], row]));
  const key = normalizeSpanish(word);
  const row = entries.get(key);
  if (!row) return null;
  const meanings = new Set(row[1]);
  const visit = (lemma: string, seen: Set<string>, depth: number) => {
    if (seen.has(lemma) || depth > 4) return;
    seen.add(lemma);
    const base = entries!.get(lemma);
    if (!base) return;
    base[1].forEach((meaning) => meanings.add(`${lemma}: ${meaning}`));
    base[2].forEach((next) => visit(next, seen, depth + 1));
  };
  row[2].forEach((lemma) => visit(lemma, new Set([key]), 0));
  return { word: key, meanings: [...meanings], lemmas: row[2] };
}
/** Keep accents, whitespace, punctuation and source spelling exactly intact. */
export function tokenizeSpanish(text: string): Token[] {
  return (text.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*|\n|[^\p{L}\p{M}\n]/gu) ?? []).map((word) => ({ word, pinyin: '', syllables: [] }));
}
