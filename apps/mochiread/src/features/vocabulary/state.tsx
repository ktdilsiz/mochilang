import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { applySm2, newCard } from '@mochilang/srs';
import { usePersistentState, type PersistenceStatus } from '../../storage/usePersistentState';
import { readVocabulary, writeVocabulary } from '../../storage/repository';
import type { VocabEntry, ReadingLanguage } from '../../storage/schema';
import { sameVocabWord } from './model';

type NewWord = Pick<VocabEntry, 'word' | 'language' | 'pinyin' | 'meanings' | 'entryId' | 'examples'>;
type VocabularyState = { vocab: VocabEntry[]; saveWord: (entry: NewWord) => void; removeWord: (word: string, language?: ReadingLanguage, entryId?: string) => void; isWordSaved: (word: string, language?: ReadingLanguage, entryId?: string) => boolean; recordReview: (word: string, remembered: boolean, language?: ReadingLanguage, entryId?: string) => void; } & PersistenceStatus;
const Context = createContext<VocabularyState | null>(null);
const EMPTY: VocabEntry[] = [];
export function VocabularyProvider({ children, language, enabled }: { children: ReactNode; language: ReadingLanguage; enabled: boolean }) {
  const load = useCallback(() => readVocabulary(language), [language]);
  const { value: entries, setValue, hydrated, error, saveError, retrySave } = usePersistentState(EMPTY, load, writeVocabulary, enabled);
  const vocab = useMemo(() => entries.filter((entry) => entry.language === language), [entries, language]);
  const saveWord = useCallback((entry: NewWord) => setValue((previous) => {
    if (previous.some((word) => sameVocabWord(word, entry.word, entry.language, entry.entryId))) return previous;
    const now = Date.now();
    return [{ ...entry, savedAt: now, ...newCard(now) }, ...previous];
  }), [setValue]);
  const removeWord = useCallback((word: string, language: ReadingLanguage = 'zh', entryId?: string) => setValue((previous) => previous.filter((entry) => !sameVocabWord(entry, word, language, entryId))), [setValue]);
  const isWordSaved = useCallback((word: string, language: ReadingLanguage = 'zh', entryId?: string) => entries.some((entry) => sameVocabWord(entry, word, language, entryId)), [entries]);
  const recordReview = useCallback((word: string, remembered: boolean, language: ReadingLanguage = 'zh', entryId?: string) => setValue((previous) => previous.map((entry) => sameVocabWord(entry, word, language, entryId) ? { ...entry, ...applySm2(entry, remembered) } : entry)), [setValue]);
  const value = useMemo(() => ({ vocab, saveWord, removeWord, isWordSaved, recordReview, hydrated, error, saveError, retrySave }), [vocab, saveWord, removeWord, isWordSaved, recordReview, hydrated, error, saveError, retrySave]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useVocabulary() {
  const value = useContext(Context);
  if (!value) throw new Error('VocabularyProvider is missing');
  return value;
}
