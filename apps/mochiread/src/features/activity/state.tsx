import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { usePersistentState, type PersistenceStatus } from '../../storage/usePersistentState';
import { readActivity, writeActivity } from '../../storage/repository';
import type { DayStats, ReadingLanguage } from '../../storage/schema';
import { upsertDay } from './model';

type ActivityState = { stats: DayStats[]; recordWordTap: () => void; recordReadingTime: (seconds: number) => void; } & PersistenceStatus;
const Context = createContext<ActivityState | null>(null);
const EMPTY: DayStats[] = [];
export function ActivityProvider({ children, language, enabled }: { children: ReactNode; language: ReadingLanguage; enabled: boolean }) {
  const load = useCallback(() => readActivity(language), [language]);
  const save = useCallback((value: DayStats[]) => writeActivity(language, value), [language]);
  const { value: stats, setValue, hydrated, error, saveError, retrySave } = usePersistentState(EMPTY, load, save, enabled);
  const recordWordTap = useCallback(() => setValue((previous) => upsertDay(previous, { wordTapsDelta: 1 })), [setValue]);
  const recordReadingTime = useCallback((seconds: number) => { if (seconds > 0) setValue((previous) => upsertDay(previous, { secondsDelta: seconds })); }, [setValue]);
  const value = useMemo(() => ({ stats, recordWordTap, recordReadingTime, hydrated, error, saveError, retrySave }), [stats, recordWordTap, recordReadingTime, hydrated, error, saveError, retrySave]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useActivity() {
  const value = useContext(Context);
  if (!value) throw new Error('ActivityProvider is missing');
  return value;
}
