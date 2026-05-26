import * as Speech from 'expo-speech'
import type { Voice } from 'expo-speech'
import { parseCourseId, type VoiceGender } from '@mochilang/shared'
import { getSettings } from '../state/useSettings'

/**
 * Map a 2-letter language code to a BCP-47 locale expo-speech understands.
 * The platform TTS engines pick a voice based on the locale, so passing
 * just "zh" or "tr" doesn't always work — the regioned form does.
 */
const LOCALE_BY_LANG: Record<string, string> = {
  zh: 'zh-CN',
  'zh-tw': 'zh-TW', // Traditional / Taiwanese Mandarin
  en: 'en-US',
  tr: 'tr-TR',
  es: 'es-ES',
  fr: 'fr-FR',
  ja: 'ja-JP',
  ko: 'ko-KR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
}

/**
 * Returns the BCP-47 locale of a course's *target* language — i.e., the
 * language the learner is studying. zh-en → zh-CN, en-tr → tr-TR, etc.
 * Falls back to zh-CN so the existing zh-en path keeps working when a
 * caller forgets to thread the course id through.
 */
export function targetLocaleForCourse(courseId: string | null | undefined): string {
  if (!courseId) return 'zh-CN'
  const parsed = parseCourseId(courseId)
  if (!parsed) return 'zh-CN'
  // `target` already carries the variant (e.g., `zh-tw`); the map
  // covers both bare and regioned forms.
  return LOCALE_BY_LANG[parsed.target] ?? parsed.target
}

/**
 * Unicode-range tells for languages that don't share Latin script. If
 * the option text matches the target's range, speak it as the target.
 * If it matches the *source's* range, speak it as the source. This is
 * how we figure out that "喜欢" should be zh-CN but "Like" should be
 * en-US inside a single zh-en exercise.
 */
const SCRIPT_RE_FOR_LANG: Record<string, RegExp> = {
  zh: /[一-鿿㐀-䶿豈-﫿]/,
  ja: /[぀-ヿ]/,
  ko: /[가-힯]/,
  ru: /[Ѐ-ӿ]/,
  ar: /[؀-ۿ]/,
  hi: /[ऀ-ॿ]/,
}

/** Turkish-specific Latin diacritics — used when both course langs are Latin. */
const TURKISH_DIACRITICS = /[çğıöşüÇĞİÖŞÜ]/

/**
 * Pick the right locale to speak `text` in, given that it appears
 * alongside `siblings` (the other options in the same exercise) within
 * a course pair. Logic, in order:
 *
 *   1. If `text` itself contains the target language's distinctive
 *      script (CJK, Hangul, Cyrillic, etc.), use the target locale.
 *   2. If any sibling has that target script but `text` doesn't, then
 *      `text` is in the *source* language (translate-to-source
 *      exercise). Use the source locale.
 *   3. Same logic for Turkish diacritics when source/target are both
 *      Latin-script.
 *   4. Otherwise default to the target locale — best guess when we
 *      have no script signal either way.
 */
export function localeForOption(
  text: string,
  siblings: string[],
  courseId: string | null | undefined,
): string {
  if (!courseId) return targetLocaleForCourse(courseId)
  const parsed = parseCourseId(courseId)
  if (!parsed) return targetLocaleForCourse(courseId)
  const targetLoc = LOCALE_BY_LANG[parsed.target] ?? parsed.target
  const sourceLoc = LOCALE_BY_LANG[parsed.source] ?? parsed.source

  const targetRe = SCRIPT_RE_FOR_LANG[parsed.target]
  const sourceRe = SCRIPT_RE_FOR_LANG[parsed.source]

  if (targetRe?.test(text)) return targetLoc
  if (sourceRe?.test(text)) return sourceLoc

  // Some sibling option has target script and this one doesn't — this
  // one is the source language.
  if (targetRe && siblings.some((s) => targetRe.test(s))) return sourceLoc
  if (sourceRe && siblings.some((s) => sourceRe.test(s))) return targetLoc

  // Latin-only territory. Look at Turkish diacritics for tr courses.
  // Polarity matters: a sibling having Turkish diacritics while THIS
  // text doesn't means the two are in different languages — this text
  // is the non-Turkish one. Previously this branch wrongly forced
  // everything to Turkish whenever any Turkish chars appeared in any
  // sibling (commonly the Turkish-language prompt), which broke
  // listen-and-choose options like ["autumn", "summer", "winter"].
  if (parsed.target === 'tr' || parsed.source === 'tr') {
    const trIsTarget = parsed.target === 'tr'
    const trLoc = 'tr-TR'
    const otherLoc = trIsTarget ? sourceLoc : targetLoc
    if (TURKISH_DIACRITICS.test(text)) return trLoc
    const someSiblingTurkish = siblings.some((s) => TURKISH_DIACRITICS.test(s))
    if (someSiblingTurkish) return otherLoc
    // No Turkish evidence anywhere — both Latin, fall back to target.
    return targetLoc
  }

  return targetLoc
}

/**
 * Mobile TTS wrapper. Honors the user's settings for voice gender and
 * speech rate.
 *
 * `expo-speech` doesn't expose gender, so we infer it from voice
 * identifier substrings the way the web wrapper does. The first call
 * triggers `getAvailableVoicesAsync` and caches the chosen identifier
 * per gender — replays after that are synchronous.
 */

const FEMALE_HINTS = ['tingting', 'mei-jia', 'sin-ji', 'female', 'tian-tian', 'yating']
const MALE_HINTS = ['hanhan', 'male', 'feng', 'liang', 'wei']

const voiceCache: Partial<Record<VoiceGender, string | null>> = {}
let voiceList: Voice[] | null = null
let voiceListPromise: Promise<Voice[]> | null = null

async function ensureVoiceList(): Promise<Voice[]> {
  if (voiceList) return voiceList
  if (!voiceListPromise) {
    voiceListPromise = Speech.getAvailableVoicesAsync().catch(() => [] as Voice[])
  }
  voiceList = await voiceListPromise
  return voiceList
}

function pickIdentifier(voices: Voice[], gender: VoiceGender): string | null {
  const zh = voices.filter((v) => v.language?.toLowerCase().startsWith('zh'))
  if (zh.length === 0) return null
  const zhCn = zh.filter((v) => v.language?.toLowerCase() === 'zh-cn')
  const pool = zhCn.length > 0 ? zhCn : zh
  const lower = (v: Voice) => `${v.identifier} ${v.name ?? ''}`.toLowerCase()
  if (gender === 'female') {
    const m = pool.find((v) => FEMALE_HINTS.some((h) => lower(v).includes(h)))
    if (m) return m.identifier
  } else if (gender === 'male') {
    const m = pool.find((v) => MALE_HINTS.some((h) => lower(v).includes(h)))
    if (m) return m.identifier
  }
  return pool[0]?.identifier ?? null
}

export function speak(
  text: string,
  opts: { rate?: number; language?: string; onDone?: () => void } = {},
) {
  const settings = getSettings()
  const rate = opts.rate ?? settings.speechRate
  // Default to Mandarin (matches the pre-existing zh focus). Callers
  // can override with the active course's target language for non-zh
  // content (e.g. Turkish dialogues).
  const language = opts.language ?? 'zh-CN'
  Speech.stop()

  const baseOpts = { language, rate, onDone: opts.onDone }

  if (settings.voice === 'auto') {
    Speech.speak(text, baseOpts)
    return
  }

  const cached = voiceCache[settings.voice]
  if (cached !== undefined) {
    Speech.speak(text, { ...baseOpts, voice: cached ?? undefined })
    return
  }

  // Fire-and-forget voice resolution — first call spends a frame loading
  // the list. We still kick off the speech immediately with whatever
  // expo-speech defaults to, then cache for the next call.
  Speech.speak(text, baseOpts)
  void ensureVoiceList().then((voices) => {
    voiceCache[settings.voice] = pickIdentifier(voices, settings.voice)
  })
}

export function stopSpeaking() {
  Speech.stop()
}
