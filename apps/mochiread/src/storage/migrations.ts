import type { Preferences, LibraryEntry } from './schema';
import { ORIGINAL_SEED_IDS, DEPRECATED_SEED_IDS, SEED_LIBRARY } from './seeds';

export function migratePrefs(raw: unknown): Partial<Preferences> {
  if (!raw || typeof raw !== 'object') return {};
  const next: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if ('showPinyin' in next && next.pinyinMode === undefined) {
    next.pinyinMode = next.showPinyin === false ? 'off' : 'hint';
  }
  delete next.showPinyin;
  if (!['kana', 'romaji', 'both'].includes(String(next.japaneseReadingMode))) next.japaneseReadingMode = 'both';
  return next as Partial<Preferences>;
}

export function makeTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 32) return cleaned || 'Untitled';
  return cleaned.slice(0, 32) + '…';
}

export function migrateLibrary(raw: unknown, seeded: string | null, introducedRaw: string | null) {
  if (!Array.isArray(raw)) throw new Error('Invalid saved library');
  const introduced = new Set<string>(introducedRaw ? JSON.parse(introducedRaw) : []);
  if (seeded && introduced.size === 0) ORIGINAL_SEED_IDS.forEach((id) => introduced.add(id));
  const deprecated = new Set(DEPRECATED_SEED_IDS);
  const seeds = new Map(SEED_LIBRARY.map((entry) => [entry.id, entry]));
  const existing = (raw as Partial<LibraryEntry>[]).map((entry): LibraryEntry => ({
    id: entry.id ?? String(Date.now()), title: entry.title ?? makeTitle(entry.text ?? ''),
    text: entry.text ?? '', language: entry.language === 'ja' ? 'ja' : 'zh', createdAt: entry.createdAt ?? Date.now(),
  })).filter((entry) => !deprecated.has(entry.id)).map((entry) => {
    const seed = seeds.get(entry.id);
    if (!seed) return entry;
    introduced.add(entry.id);
    return { ...entry, title: seed.title, text: seed.text };
  });
  const added = SEED_LIBRARY.filter((entry) => !introduced.has(entry.id));
  added.forEach((entry) => introduced.add(entry.id));
  return { library: [...added, ...existing], introduced: [...introduced] };
}
