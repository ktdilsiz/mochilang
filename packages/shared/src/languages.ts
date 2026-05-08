/**
 * Language registry + course-id helpers.
 *
 * Course ids in the API are `${target}-${source}`, e.g. `zh-en` is
 * "Chinese for speakers of English". The Language type carries display
 * metadata (English name, native name, flag emoji) so picker UIs don't
 * have to inline strings, and the helpers here build/parse course ids
 * uniformly across both apps.
 */

export interface LanguageInfo {
  /** ISO-639-style 2-letter code: "en", "zh", "tr", etc. */
  code: string
  /** Display name in English. */
  name: string
  /** Display name in the language itself ("中文", "Türkçe"). */
  nativeName: string
  /** Country/region flag emoji to anchor the language visually. */
  flag: string
}

/**
 * The languages we know how to label. A language can appear here without
 * a course existing for it — the picker filters by what `/api/content/
 * courses` actually returns. New languages added by content authors
 * just need a row here for the picker to render them with a flag/name.
 */
export const LANGUAGES_REGISTRY: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
]

/** Look up a language entry by code, or `undefined` if unknown. */
export function findLanguage(code: string): LanguageInfo | undefined {
  return LANGUAGES_REGISTRY.find((l) => l.code === code)
}

/** Build a course id from a learning + source language pair. */
export function buildCourseId(target: string, source: string): string {
  return `${target}-${source}`
}

/**
 * Parse a course id like `zh-en` back into `{ target: 'zh', source: 'en' }`.
 * Returns null if the format isn't `<2letter>-<2letter>`.
 */
export function parseCourseId(
  id: string
): { target: string; source: string } | null {
  const m = /^([a-z]{2})-([a-z]{2})$/i.exec(id)
  if (!m) return null
  return { target: m[1].toLowerCase(), source: m[2].toLowerCase() }
}
