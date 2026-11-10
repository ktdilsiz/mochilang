import type { VocabEntry, ReadingLanguage } from '../../storage/schema';

export function sameVocabWord(entry: VocabEntry, word: string, language: ReadingLanguage, entryId?: string) {
  return entry.word === word && entry.language === language &&
    (language === 'zh' || entry.entryId === entryId);
}
