import { createContext, useContext, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { PreferencesProvider, usePreferences } from '../features/settings/state';
import { LibraryProvider, useLibrary } from '../features/library/state';
import { VocabularyProvider, useVocabulary } from '../features/vocabulary/state';
import { ActivityProvider, useActivity } from '../features/activity/state';
import type { ReadingLanguage } from '../storage/schema';

const Hydration = createContext({ hydrated: false, error: null as Error | null, saveError: null as Error | null, retrySave: () => {}, dirty: false, getUnsavedData: () => ({} as Record<string, string>) });
function HydrationProvider({ children }: { children: ReactNode }) {
  const preferences = usePreferences(), library = useLibrary(), vocabulary = useVocabulary(), activity = useActivity();
  const hydrated = preferences.hydrated && library.hydrated && vocabulary.hydrated && activity.hydrated;
  const error = preferences.error ?? library.error ?? vocabulary.error ?? activity.error;
  const saveError = preferences.saveError ?? library.saveError ?? vocabulary.saveError ?? activity.saveError;
  const retrySave = useCallback(() => {
    preferences.retrySave(); library.retrySave(); vocabulary.retrySave(); activity.retrySave();
  }, [preferences.retrySave, library.retrySave, vocabulary.retrySave, activity.retrySave]);
  const dirty = preferences.dirty || library.dirty || vocabulary.dirty || activity.dirty;
  const domains = useRef([preferences, library, vocabulary, activity]);
  domains.current = [preferences, library, vocabulary, activity];
  const getUnsavedData = useCallback(() => Object.assign({}, ...domains.current.map((domain) => domain.getUnsavedData())) as Record<string, string>, []);
  const value = useMemo(() => ({ hydrated, error, saveError, retrySave, dirty, getUnsavedData }), [hydrated, error, saveError, retrySave, dirty, getUnsavedData]);
  return <Hydration.Provider value={value}>{children}</Hydration.Provider>;
}
export function StoreProvider({ children, language = 'zh', enabled = true }: { children: ReactNode; language?: ReadingLanguage; enabled?: boolean }) {
  const props = { language, enabled };
  return <PreferencesProvider {...props}><LibraryProvider {...props}><VocabularyProvider {...props}><ActivityProvider {...props}>
    <HydrationProvider>{children}</HydrationProvider>
  </ActivityProvider></VocabularyProvider></LibraryProvider></PreferencesProvider>;
}
export const useHydration = () => useContext(Hydration);
