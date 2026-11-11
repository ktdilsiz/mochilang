import { useCallback, useEffect, useRef, useState } from 'react';

export type PersistenceStatus = {
  hydrated: boolean;
  error: Error | null;
  saveError: Error | null;
  retrySave: () => void;
  dirty: boolean;
  getUnsavedData: () => Record<string, string>;
};

export function usePersistentState<T>(initial: T, load: () => Promise<T>, save: (value: T) => Promise<void>, enabled: boolean, snapshot?: (value: T) => Record<string, string>) {
  const [value, setValue] = useState(initial);
  const [savedValue, setSavedValue] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const dirty = hydrated && value !== savedValue;
  const retrySave = useCallback(() => { if (dirty || saveError) setAttempt((previous) => previous + 1); }, [dirty, saveError]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void load().then((saved) => {
      if (active) { setValue(saved); setSavedValue(saved); setHydrated(true); }
    }).catch((cause: unknown) => {
      // Failed reads must not persist defaults over existing user data.
      if (active) setError(cause instanceof Error ? cause : new Error('Could not read saved data'));
    });
    return () => { active = false; };
  }, [load, enabled]);
  useEffect(() => {
    if (!hydrated || !enabled) return;
    let active = true;
    // Keep writes ordered and ignore results from superseded snapshots.
    queue.current = queue.current.then(async () => {
      if (!active) return;
      try {
        await save(value);
        if (active) { setSavedValue(value); setSaveError(null); }
      } catch (cause: unknown) {
        if (active) setSaveError(cause instanceof Error ? cause : new Error('Could not save data'));
      }
    });
    return () => { active = false; };
  }, [value, hydrated, save, enabled, attempt]);
  const getUnsavedData = useCallback(() => dirty && snapshot ? snapshot(value) : {}, [dirty, snapshot, value]);
  return { value, setValue, hydrated, error, saveError, retrySave, dirty, getUnsavedData };
}
