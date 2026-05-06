/**
 * Web Speech API wrapper for Chinese TTS. Used in `listen_and_choose`
 * exercises. Free, on-device, no API key — quality varies by OS but is
 * adequate for short words and phrases.
 */

let chineseVoice: SpeechSynthesisVoice | null = null

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  if (chineseVoice) return chineseVoice
  const voices = window.speechSynthesis.getVoices()
  // Prefer zh-CN, fall back to anything starting with "zh".
  chineseVoice =
    voices.find((v) => v.lang.toLowerCase() === 'zh-cn') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('zh')) ||
    null
  return chineseVoice
}

export function speak(text: string, opts: { rate?: number } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  // Some browsers populate voices async; trigger a re-pick on each call so
  // that by the time the user actually clicks, voices are loaded.
  const voice = pickChineseVoice()
  // Cancel any in-flight utterances so sequential clicks don't queue.
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  if (voice) u.voice = voice
  u.rate = opts.rate ?? 0.9
  u.pitch = 1.0
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}
