/**
 * Web Speech API wrapper for Chinese TTS. Used in `listen_and_choose`
 * exercises. Free, on-device, no API key — quality varies by OS but is
 * adequate for short words and phrases.
 *
 * Voice + rate honor the user's `useSettings()` preferences. The picker
 * caches a chosen voice per gender so we don't re-scan the voice list on
 * every utterance.
 */

import type { VoiceGender } from '@mochilang/shared'
import { getSettings } from '../settings'

const voiceCache: Partial<Record<VoiceGender, SpeechSynthesisVoice | null>> = {}

function chineseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('zh'))
}

/**
 * Pick a Chinese voice matching the requested gender. The Web Speech API
 * doesn't expose gender directly, so we substring-match the voice name
 * for known cues ("Tingting", "Mei-Jia", "female" → female; "Sin-ji",
 * "Lili", "male" → male). On miss we fall back to the first zh-CN voice
 * we find — better than no audio at all.
 */
function pickChineseVoice(gender: VoiceGender): SpeechSynthesisVoice | null {
  if (gender in voiceCache) return voiceCache[gender] ?? null
  const voices = chineseVoices()
  if (voices.length === 0) {
    voiceCache[gender] = null
    return null
  }
  const zhCn = voices.filter((v) => v.lang.toLowerCase() === 'zh-cn')
  const pool = zhCn.length > 0 ? zhCn : voices

  const lower = (v: SpeechSynthesisVoice) => v.name.toLowerCase()
  const FEMALE_HINTS = ['tingting', 'mei-jia', 'sin-ji', 'female', 'tian-tian', 'yating']
  const MALE_HINTS = ['hanhan', 'male', 'feng', 'liang', 'wei']

  let chosen: SpeechSynthesisVoice | undefined
  if (gender === 'female') {
    chosen = pool.find((v) => FEMALE_HINTS.some((h) => lower(v).includes(h)))
  } else if (gender === 'male') {
    chosen = pool.find((v) => MALE_HINTS.some((h) => lower(v).includes(h)))
  }
  voiceCache[gender] = chosen ?? pool[0] ?? null
  return voiceCache[gender] ?? null
}

interface SpeakOptions {
  /** Override the user's configured rate. Mostly for "slow" replay buttons. */
  rate?: number
}

export function speak(text: string, opts: SpeakOptions = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const settings = getSettings()
  // Voices populate async on some browsers; pick on each call to recover.
  const voice = pickChineseVoice(settings.voice)
  // Cancel any in-flight utterances so sequential clicks don't queue.
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  if (voice) u.voice = voice
  u.rate = opts.rate ?? settings.speechRate
  u.pitch = 1.0
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}
