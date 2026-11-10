import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { usePersistentState, type PersistenceStatus } from '../../storage/usePersistentState';
import { readPreferences, writePreferences } from '../../storage/repository';
import type { Preferences, ReadingLanguage } from '../../storage/schema';
import { DEFAULT_PREFS } from './preferences';

type PreferencesState = { prefs: Preferences; setPrefs: (patch: Partial<Preferences>) => void; } & PersistenceStatus;
const Context = createContext<PreferencesState | null>(null);
export function PreferencesProvider({ children, language, enabled }: { children: ReactNode; language: ReadingLanguage; enabled: boolean }) {
  const load = useCallback(() => readPreferences(language), [language]);
  const save = useCallback((value: Preferences) => writePreferences(language, value), [language]);
  const { value: prefs, setValue, hydrated, error, saveError, retrySave } = usePersistentState(DEFAULT_PREFS, load, save, enabled);
  const setPrefs = useCallback((patch: Partial<Preferences>) => setValue((previous) => ({ ...previous, ...patch })), [setValue]);
  const value = useMemo(() => ({ prefs, setPrefs, hydrated, error, saveError, retrySave }), [prefs, setPrefs, hydrated, error, saveError, retrySave]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('PreferencesProvider is missing');
  return value;
}
