import { lookupJapanese, romanizeJapanese, type JapaneseDefinition, type Token } from '@mochilang/dict';
import type { JapaneseReadingMode, ReadingLanguage } from '../state';

export function readingLines(reading: string, language: ReadingLanguage, mode: JapaneseReadingMode, word?: string, entryId?: string, definition?: JapaneseDefinition): string[] {
  if (!reading) return [];
  if (language === 'zh') return [reading];
  const entry = definition ?? (word && ['は', 'へ', 'を'].includes(word) ? lookupJapanese(word, { entryId }) : null);
  const particle = entry?.senses.some((sense) => sense.partsOfSpeech.includes('prt')) ?? false;
  const romaji = romanizeJapanese(reading, particle);
  if (mode === 'kana') return [reading];
  if (mode === 'romaji') return romaji ? [romaji] : [];
  return romaji ? [reading, romaji] : [reading];
}

export function tokenReadingLines(token: Token, mode: JapaneseReadingMode): string[] {
  return readingLines(token.pinyin, 'ja', mode, token.word, token.japanese?.entryId, token.japanese);
}
