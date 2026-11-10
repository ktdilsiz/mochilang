import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { usePersistentState } from '../../storage/usePersistentState';
import { readLibrary, writeLibrary } from '../../storage/repository';
import { makeTitle } from '../../storage/migrations';
import type { LibraryEntry, ReadingLanguage } from '../../storage/schema';

type LibraryState = { library: LibraryEntry[]; saveText: (text: string, language: ReadingLanguage) => LibraryEntry; removeText: (id: string) => void; reorderLibrary: (entries: LibraryEntry[]) => void; hydrated: boolean; error: Error | null };
const Context = createContext<LibraryState | null>(null);
const EMPTY: LibraryEntry[] = [];
export function LibraryProvider({ children, language, enabled }: { children: ReactNode; language: ReadingLanguage; enabled: boolean }) {
  const { value: entries, setValue, hydrated, error } = usePersistentState(EMPTY, readLibrary, writeLibrary, enabled);
  const library = useMemo(() => entries.filter((entry) => entry.language === language), [entries, language]);
  const saveText = useCallback((text: string, language: ReadingLanguage) => {
    const existing = entries.find((entry) => entry.text === text && entry.language === language);
    if (existing) return existing;
    const entry = { id: String(Date.now()) + Math.random().toString(36).slice(2, 6), title: makeTitle(text), text, language, createdAt: Date.now() };
    setValue((previous) => [entry, ...previous]);
    return entry;
  }, [entries, setValue]);
  const removeText = useCallback((id: string) => setValue((previous) => previous.filter((entry) => entry.id !== id)), [setValue]);
  const reorderLibrary = useCallback((next: LibraryEntry[]) => setValue((previous) => {
    let index = 0;
    return previous.map((entry) => entry.language === language ? next[index++] ?? entry : entry);
  }), [language, setValue]);
  const value = useMemo(() => ({ library, saveText, removeText, reorderLibrary, hydrated, error }), [library, saveText, removeText, reorderLibrary, hydrated, error]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLibrary() {
  const value = useContext(Context);
  if (!value) throw new Error('LibraryProvider is missing');
  return value;
}
