/**
 * Tiny synthesized sound effects via the Web Audio API. No files to ship,
 * works offline, no licensing. Sounds are intentionally short and unobtrusive.
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  // Auto-resume — most browsers suspend AudioContext until a user gesture; if
  // we miss the resume the first sound is silent. The fix is cheap.
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

function tone(
  ac: AudioContext,
  freq: number,
  durationSec: number,
  startOffset = 0,
  type: OscillatorType = 'sine',
  peak = 0.18
) {
  const t0 = ac.currentTime + startOffset
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  // Smooth attack/decay so it doesn't click
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + durationSec + 0.02)
}

export function playCorrect() {
  const ac = getContext()
  if (!ac) return
  // Bright two-note major-third "ding"
  tone(ac, 880, 0.15, 0, 'triangle', 0.2) // A5
  tone(ac, 1320, 0.25, 0.08, 'triangle', 0.18) // E6
}

export function playWrong() {
  const ac = getContext()
  if (!ac) return
  // Soft descending two-note buzz
  tone(ac, 220, 0.18, 0, 'sawtooth', 0.12)
  tone(ac, 165, 0.28, 0.08, 'sawtooth', 0.1)
}

export function playLessonComplete() {
  const ac = getContext()
  if (!ac) return
  // Three-note arpeggio
  tone(ac, 660, 0.15, 0, 'triangle', 0.2)
  tone(ac, 880, 0.15, 0.1, 'triangle', 0.2)
  tone(ac, 1320, 0.35, 0.2, 'triangle', 0.22)
}
