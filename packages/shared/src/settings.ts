/**
 * User-facing app settings.
 *
 * Stored locally per-app (localStorage on web, AsyncStorage on RN) — the
 * values here don't currently sync to the backend because they're
 * client-only preferences that reflect device capabilities (TTS voices,
 * audio output, haptics). The shapes live in shared so settings screens
 * and the runtime consumers (LessonScreen, audio playback, animations)
 * agree on the schema without each app re-declaring it.
 */

/**
 * Speech voice preference for TTS playback in `listen_and_choose` and
 * any future audio-driven exercises. `auto` lets the system pick — most
 * Web Speech API engines and Expo Speech default sensibly when the
 * preference is unset, so this is the safe default until the user
 * expresses one.
 */
export type VoiceGender = 'auto' | 'female' | 'male'

/** Multiplier on the engine's default rate. 1.0 = native speed. */
export type SpeechRate = 0.7 | 0.85 | 1.0 | 1.15 | 1.3

/** Big-three theme states. `system` follows the OS preference at render time. */
export type ThemeMode = 'system' | 'light' | 'dark'

export interface AppSettings {
  voice: VoiceGender
  speechRate: SpeechRate
  /** Master switch for short button-press / answer-correct sound effects. */
  soundEffects: boolean
  /** Vibration on correct/incorrect answer (mobile). On web this is a no-op. */
  haptics: boolean
  /** Show pulse + bounce on the lesson path. Some users find motion distracting. */
  animations: boolean
  /** Auto-play the TTS clip on listen-and-choose so the user doesn't need to tap. */
  autoPlayAudio: boolean
  /** Show pinyin under Chinese prompts in lessons + guides. */
  showPinyin: boolean
  /** Daily-XP target used by Profile + streak banners. */
  dailyXpGoal: 10 | 20 | 30 | 50
  theme: ThemeMode
  /**
   * Developer override. When true:
   *   - every topic and lesson is reachable (skips the prev-cleared gate)
   *   - every mochi in the village renders unlocked regardless of XP
   * Off by default; flipping it on doesn't grant XP or complete anything,
   * it just disables the gating so the whole content tree is browsable.
   */
  developerMode: boolean
  /**
   * UI language. Independent of the course the user is studying —
   * a Turkish speaker learning English picks 'tr' here so the app
   * chrome speaks Turkish, while their *lessons* still teach English.
   */
  uiLocale: 'en' | 'zh' | 'tr'
}

export const SETTINGS_DEFAULT: AppSettings = {
  voice: 'auto',
  speechRate: 1.0,
  soundEffects: true,
  haptics: true,
  animations: true,
  autoPlayAudio: false,
  showPinyin: true,
  dailyXpGoal: 20,
  theme: 'system',
  developerMode: false,
  uiLocale: 'en',
}

/** Storage key used by both apps so a future sync layer has one source. */
export const SETTINGS_STORAGE_KEY = 'mochilang:settings:v1'

/**
 * Forgiving merge — anything missing on the stored side falls back to
 * defaults, anything unknown gets dropped. Lets us add fields without
 * forcing a migration; old persisted blobs just gain the new defaults.
 */
export function mergeSettings(stored: unknown): AppSettings {
  if (!stored || typeof stored !== 'object') return { ...SETTINGS_DEFAULT }
  const s = stored as Partial<AppSettings>
  return {
    voice: pick(s.voice, ['auto', 'female', 'male'], SETTINGS_DEFAULT.voice),
    speechRate: pick(
      s.speechRate,
      [0.7, 0.85, 1.0, 1.15, 1.3],
      SETTINGS_DEFAULT.speechRate
    ),
    soundEffects: typeof s.soundEffects === 'boolean' ? s.soundEffects : SETTINGS_DEFAULT.soundEffects,
    haptics: typeof s.haptics === 'boolean' ? s.haptics : SETTINGS_DEFAULT.haptics,
    animations: typeof s.animations === 'boolean' ? s.animations : SETTINGS_DEFAULT.animations,
    autoPlayAudio: typeof s.autoPlayAudio === 'boolean' ? s.autoPlayAudio : SETTINGS_DEFAULT.autoPlayAudio,
    showPinyin: typeof s.showPinyin === 'boolean' ? s.showPinyin : SETTINGS_DEFAULT.showPinyin,
    dailyXpGoal: pick(s.dailyXpGoal, [10, 20, 30, 50], SETTINGS_DEFAULT.dailyXpGoal),
    theme: pick(s.theme, ['system', 'light', 'dark'], SETTINGS_DEFAULT.theme),
    developerMode:
      typeof s.developerMode === 'boolean' ? s.developerMode : SETTINGS_DEFAULT.developerMode,
    uiLocale: pick(s.uiLocale, ['en', 'zh', 'tr'], SETTINGS_DEFAULT.uiLocale),
  }
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(value as T) ? (value as T) : fallback
}

/** Human labels for picker UIs — kept here so both apps stay consistent. */
export const VOICE_LABELS: Record<VoiceGender, string> = {
  auto: 'Auto',
  female: 'Female',
  male: 'Male',
}

export const SPEECH_RATE_LABELS: Record<SpeechRate, string> = {
  0.7: '0.7×',
  0.85: '0.85×',
  1.0: '1×',
  1.15: '1.15×',
  1.3: '1.3×',
}

export const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}
