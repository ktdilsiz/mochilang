/**
 * Sound effects.
 *
 * Plays small WAV files for correct/wrong/complete/tap feedback. Gated
 * by the user's `soundEffects` setting (Settings → Audio). Sounds are
 * loaded once on first use and cached; replay is a near-zero-cost
 * `replayAsync()`.
 *
 * iOS audio session: we intentionally do NOT set
 * `playsInSilentModeIOS: true`. Users on silent mode shouldn't hear
 * chimes during a lesson — that matches every other mobile game.
 */

import { Audio } from 'expo-av'
import { getSettings } from '../state/useSettings'

type SfxName = 'correct' | 'wrong' | 'complete' | 'tap'

// require() returns Metro module ids that expo-av accepts as sources.
const SOURCES: Record<SfxName, number> = {
  correct: require('../../assets/sfx/correct.wav'),
  wrong: require('../../assets/sfx/wrong.wav'),
  complete: require('../../assets/sfx/complete.wav'),
  tap: require('../../assets/sfx/tap.wav'),
}

const cache: Partial<Record<SfxName, Audio.Sound>> = {}
let loadPromise: Partial<Record<SfxName, Promise<Audio.Sound>>> = {}

async function get(name: SfxName): Promise<Audio.Sound> {
  if (cache[name]) return cache[name] as Audio.Sound
  if (loadPromise[name]) return loadPromise[name] as Promise<Audio.Sound>
  loadPromise[name] = (async () => {
    const { sound } = await Audio.Sound.createAsync(SOURCES[name], {
      shouldPlay: false,
      volume: 0.9,
    })
    cache[name] = sound
    return sound
  })()
  return loadPromise[name] as Promise<Audio.Sound>
}

/**
 * Fire-and-forget playback. Honors the user's `soundEffects` toggle.
 * Failures (audio session unavailable, file decode error) are swallowed
 * — sfx are nice-to-have, never block lesson flow on them.
 */
export function play(name: SfxName): void {
  if (!getSettings().soundEffects) return
  void (async () => {
    try {
      const sound = await get(name)
      // replayAsync rewinds + plays, which is what we want for rapid
      // re-fires (consecutive correct answers, tap on tap on tap…).
      await sound.replayAsync()
    } catch {
      /* swallow */
    }
  })()
}

export const sfx = {
  correct: () => play('correct'),
  wrong: () => play('wrong'),
  complete: () => play('complete'),
  tap: () => play('tap'),
}
