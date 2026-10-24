import { lookupJapanese } from '@mochilang/dict';
import type { VocabEntry, ReadingLanguage } from '../state';

export function sameVocabWord(entry: VocabEntry, word: string, language: ReadingLanguage, entryId?: string) {
  return entry.word === word && entry.language === language &&
    (language === 'zh' || entry.entryId === entryId);
}

/** Canonicalize old surface-form cards while retaining their review history. */
export function migrateVocabulary(raw: Partial<VocabEntry>[]): VocabEntry[] {
  const migrated = new Map<string, VocabEntry>();
  for (const value of raw) {
    if (!value?.word) continue;
    const language = value.language === 'ja' ? 'ja' : 'zh';
    const match = language === 'ja' && !value.entryId ? lookupJapanese(value.word) : null;
    const entry: VocabEntry = {
      word: match?.dictionaryForm ?? value.word,
      language,
      pinyin: match?.dictionaryReading ?? value.pinyin ?? '',
      meanings: match?.meanings ?? value.meanings ?? [],
      entryId: match?.entryId ?? value.entryId,
      examples: value.examples ?? (match?.conjugation ? [{ sentence: value.word, surface: value.word }] : []),
      savedAt: value.savedAt ?? Date.now(),
      remembered: value.remembered ?? 0,
      forgotten: value.forgotten ?? 0,
      lastReviewedAt: value.lastReviewedAt,
      ease: value.ease ?? 2.5,
      intervalDays: value.intervalDays ?? 0,
      dueAt: value.dueAt ?? Date.now(),
    };
    const key = `${language}:${entry.entryId ?? ''}:${entry.word}`;
    const previous = migrated.get(key);
    if (previous) {
      previous.remembered += entry.remembered;
      previous.forgotten += entry.forgotten;
      previous.savedAt = Math.min(previous.savedAt, entry.savedAt);
      previous.dueAt = Math.min(previous.dueAt, entry.dueAt);
      previous.intervalDays = Math.min(previous.intervalDays, entry.intervalDays);
      previous.ease = Math.min(previous.ease, entry.ease);
      previous.lastReviewedAt = Math.max(previous.lastReviewedAt ?? 0, entry.lastReviewedAt ?? 0) || undefined;
      previous.examples = [...previous.examples ?? [], ...entry.examples ?? []].filter((example, i, examples) => examples.findIndex((other) => other.sentence === example.sentence && other.surface === example.surface) === i).slice(0, 5);
    } else migrated.set(key, entry);
  }
  return [...migrated.values()];
}
