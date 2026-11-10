import { storage } from './driver';
import { KEYS, preferencesKey, activityKey, readingTextKey, readingPageKey } from './keys';
import { migratePrefs, migrateLibrary } from './migrations';
import { migrateVocabulary } from './vocabulary-migration';
import { DEFAULT_PREFS } from './defaults';
import { SEED_LIBRARY } from './seeds';
import type { Preferences, LibraryEntry, VocabEntry, DayStats, ReadingLanguage } from './schema';

export async function readPreferences(language: ReadingLanguage): Promise<Preferences> {
  const raw = await storage.getItem(preferencesKey(language)) ?? (language === 'es' ? null : await storage.getItem(KEYS.prefs));
  return { ...DEFAULT_PREFS, ...migratePrefs(raw ? JSON.parse(raw) : null) };
}
export const writePreferences = (language: ReadingLanguage, value: Preferences) => storage.setItem(preferencesKey(language), JSON.stringify(value));

export async function readLibrary(): Promise<LibraryEntry[]> {
  const values = Object.fromEntries(await storage.multiGet([KEYS.library, KEYS.seeded, KEYS.introduced]));
  const next = migrateLibrary(values[KEYS.library] ? JSON.parse(values[KEYS.library]!) : [], values[KEYS.seeded], values[KEYS.introduced]);
  return next.library;
}
export async function writeLibrary(value: LibraryEntry[]) {
  const raw = await storage.getItem(KEYS.introduced);
  const introduced = new Set<string>(raw ? JSON.parse(raw) : []);
  SEED_LIBRARY.forEach((entry) => introduced.add(entry.id));
  // Save entries before metadata. A failed write remains retryable without
  // blocking hydration or marking absent starter texts as introduced.
  await storage.setItem(KEYS.library, JSON.stringify(value));
  await storage.multiSet([[KEYS.introduced, JSON.stringify([...introduced])], [KEYS.seeded, '1']]);
}
export async function readVocabulary(language: ReadingLanguage): Promise<VocabEntry[]> {
  const raw = await storage.getItem(KEYS.vocab);
  return migrateVocabulary(raw ? JSON.parse(raw) : [], language);
}
export const writeVocabulary = (value: VocabEntry[]) => storage.setItem(KEYS.vocab, JSON.stringify(value));

export async function readActivity(language: ReadingLanguage): Promise<DayStats[]> {
  const raw = await storage.getItem(activityKey(language)) ?? (language === 'zh' ? await storage.getItem(KEYS.stats) : null);
  return ((raw ? JSON.parse(raw) : []) as Partial<DayStats>[]).filter((day): day is DayStats =>
    typeof day?.date === 'string' && typeof day.wordTaps === 'number' && typeof day.secondsRead === 'number');
}
export const writeActivity = (language: ReadingLanguage, value: DayStats[]) => storage.setItem(activityKey(language), JSON.stringify(value));

export async function readReadingSession(language: ReadingLanguage) {
  const values = Object.fromEntries(await storage.multiGet([readingTextKey(language), readingPageKey(language), KEYS.readingLanguage, KEYS.readingText, KEYS.readingPage]));
  const legacyMatches = (values[KEYS.readingLanguage] === 'ja' ? 'ja' : 'zh') === language;
  const text = values[readingTextKey(language)] ?? (legacyMatches ? values[KEYS.readingText] : null);
  const rawPage = values[readingPageKey(language)] ?? (legacyMatches ? values[KEYS.readingPage] : null);
  const page = rawPage ? parseInt(rawPage, 10) : undefined;
  return { text, page: page !== undefined && Number.isFinite(page) && page >= 0 ? page : undefined };
}
export const writeReadingText = (language: ReadingLanguage, text: string) => storage.setItem(readingTextKey(language), text);
export const writeReadingPage = (language: ReadingLanguage, page: number) => storage.setItem(readingPageKey(language), String(page));
export const getPreferredLanguage = () => storage.getItem(KEYS.preferredLanguage);
export const setPreferredLanguage = (language: ReadingLanguage) => storage.setItem(KEYS.preferredLanguage, language);
