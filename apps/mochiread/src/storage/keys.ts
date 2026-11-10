import type { ReadingLanguage } from './schema';

// Persisted names are a compatibility contract with existing browser data.
export const KEYS = {
  library: 'mochiread:library', vocab: 'mochiread:vocab',
  prefs: 'mochiread:prefs', stats: 'mochiread:stats',
  seeded: 'mochiread:seeded', introduced: 'mochiread:introduced-seeds',
  readingText: 'mochiread:reading:text', readingPage: 'mochiread:reading:page',
  readingLanguage: 'mochiread:reading:language', preferredLanguage: 'mochiread:preferred-language',
  restoreJournal: 'mochiread:restore-journal',
} as const;
export const preferencesKey = (language: ReadingLanguage) => `${KEYS.prefs}:${language}`;
export const activityKey = (language: ReadingLanguage) => `${KEYS.stats}:${language}`;
export const readingTextKey = (language: ReadingLanguage) => `${KEYS.readingText}:${language}`;
export const readingPageKey = (language: ReadingLanguage) => `${KEYS.readingPage}:${language}`;

// Preserve the version-1 backup contract. Language preference is device-local.
export const BACKUP_KEYS = [
  KEYS.library, KEYS.vocab, KEYS.prefs, KEYS.stats, KEYS.seeded, KEYS.introduced, KEYS.readingLanguage,
  ...(['zh', 'ja'] as const).flatMap((language) => [preferencesKey(language), activityKey(language), readingTextKey(language), readingPageKey(language)]),
  KEYS.readingText, KEYS.readingPage,
];
