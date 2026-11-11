import { KEYS } from './keys';
import { storage } from './driver';

const versions = new Map<string, string | null>();
let localQueue: Promise<unknown> = Promise.resolve();
export class StorageConflictError extends Error {
  constructor() {
    super('Saved data changed in another tab. Download a backup of your edits, then reload this tab before continuing.');
    this.name = 'StorageConflictError';
  }
}
/** Web Locks serialize check/write and restore transactions across tabs. */
export async function withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('mochiread:storage', operation);
  }
  const pending = localQueue.then(operation);
  localQueue = pending.catch(() => {});
  return pending;
}
export async function readTracked(keys: string[]): Promise<Record<string, string | null>> {
  return withStorageLock(async () => {
    const values = await storage.multiGet(keys);
    values.forEach(([key, value]) => versions.set(key, value));
    return Object.fromEntries(values);
  });
}
export const loadedValue = (key: string) => versions.get(key) ?? null;
export async function writeTracked(entries: [string, string][]): Promise<void> {
  // Capture before waiting: a remounted reader must not authorize an old write.
  const expected = entries.map(([key]) => versions.get(key));
  await withStorageLock(async () => {
    if (await storage.getItem(KEYS.restoreJournal)) throw new StorageConflictError();
    const current = await storage.multiGet(entries.map(([key]) => key));
    if (current.some(([, raw], index) => expected[index] === undefined || raw !== expected[index])) throw new StorageConflictError();
    for (const [key, value] of entries) {
      await storage.setItem(key, value);
      // Partial quota failures can be retried without conflicting with ourselves.
      versions.set(key, value);
    }
  });
}
