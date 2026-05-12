import * as Speech from 'expo-speech'
import type { Voice } from 'expo-speech'
import type { VoiceGender } from '@mochilang/shared'
import { getSettings } from '../state/useSettings'

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
