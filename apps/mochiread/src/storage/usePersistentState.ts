import { useEffect, useState } from 'react';

export function usePersistentState<T>(initial: T, load: () => Promise<T>, save: (value: T) => Promise<void>, enabled: boolean) {
  const [value, setValue] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void load().then((saved) => {
      if (active) { setValue(saved); setHydrated(true); }
    }).catch((cause: unknown) => {
      // Failed reads must not persist defaults over existing user data.
      if (active) setError(cause instanceof Error ? cause : new Error('Could not read saved data'));
    });
    return () => { active = false; };
  }, [load, enabled]);
  useEffect(() => {
    if (hydrated) void save(value).catch((cause) => console.error('Could not save MochiRead data', cause));
  }, [value, hydrated, save]);
  return { value, setValue, hydrated, error };
}
