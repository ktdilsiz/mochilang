import { withStorageLock } from './concurrency';
import { storage } from './driver';
import { KEYS } from './keys';
import { BACKUP_KEYS, parseBackup, type Backup } from './backup-format';

const JOURNAL = KEYS.restoreJournal;

async function readData(): Promise<Record<string, string>> {
  const values = await storage.multiGet(BACKUP_KEYS);
  return Object.fromEntries(values.filter((entry): entry is [string, string] => entry[1] !== null));
}

async function writeData(data: Record<string, string>) {
  const entries = Object.entries(data).filter(([key]) => BACKUP_KEYS.includes(key));
  // Free keys absent from the snapshot first, including during rollback, so
  // partially written replacement data cannot prevent recovery near the quota.
  const missing = BACKUP_KEYS.filter((key) => !Object.hasOwn(data, key));
  if (missing.length) await storage.multiRemove(missing);
  if (entries.length) await storage.multiSet(entries);
}

/** A tab closed during a restore rolls back to its previous data on next entry. */
export async function recoverInterruptedRestore() {
  return withStorageLock(async () => {
    const journal = await storage.getItem(JOURNAL);
    if (!journal) return;
    const previous = JSON.parse(journal) as Record<string, string>;
    await writeData(previous);
    await storage.removeItem(JOURNAL);
  });
}

export async function createBackup(snapshot: Record<string, string> = {}): Promise<Backup> {
  const frozen = { ...snapshot };
  return withStorageLock(async () => {
    if (await storage.getItem(JOURNAL)) throw new Error('Reload MochiRead to recover the interrupted restore before exporting a backup.');
    const data = { ...await readData(), ...frozen };
    data[KEYS.library] ??= '[]';
    data[KEYS.vocab] ??= '[]';
    return parseBackup(JSON.stringify({ format: 'mochiread-backup', version: 1, createdAt: new Date().toISOString(), data }));
  });
}

export async function restoreBackup(input: Backup) {
  const backup = parseBackup(JSON.stringify(input));
  return withStorageLock(async () => {
    const previous = await readData();
    try { await storage.setItem(JOURNAL, JSON.stringify(previous)); }
    catch { throw new Error('Couldn’t create a recovery copy in browser storage. Nothing has been changed. Download your current backup before freeing storage and trying again.'); }
    try {
      await writeData(backup.data);
      await storage.removeItem(JOURNAL);
    } catch {
      try {
        await writeData(previous);
        await storage.removeItem(JOURNAL);
      } catch {
        throw new Error('Restore could not finish. Reload MochiRead to recover the previous data before trying again.');
      }
      throw new Error('Restore failed. Your previous data has been restored. Your browser may not have enough storage space.');
    }
  });
}
