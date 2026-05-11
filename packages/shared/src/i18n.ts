/**
 * UI localization for mochilang.
 *
 * The full UI string dictionary is served from the API (one JSON
 * payload per locale) so the app owner can ship new translations
 * without a binary release. The bundled English dict here is the
 * source-of-truth key list AND the fallback that ships in-app for
 * first-launch / offline cases.
 *
 * Conventions:
 *   - Keys are flat dotted paths grouped by screen (`settings.title`,
 *     `home.next_up`). Nested keys are fine for organization but
 *     never expressed nested in code — string lookups stay flat.
 *   - Placeholders use `{name}` syntax; pass values through the
 *     `params` argument of `t()`. Missing placeholders are left
 *     unsubstituted so authors can spot drift.
 *   - Missing keys fall back to the bundled English string. Missing
 *     in English too → return the key itself so the issue is loud.
 */

export type UiLocale = 'en' | 'zh' | 'tr'

export const SUPPORTED_LOCALES: UiLocale[] = ['en', 'zh', 'tr']

export const LOCALE_LABELS: Record<UiLocale, string> = {
  en: 'English',
  zh: '中文',
  tr: 'Türkçe',
}

export type I18nDict = Record<string, string>

/**
 * Bundled English dictionary. Keep this as the master list of UI
 * keys — when adding a new translatable string in code, add the key
 * here first, then the API-served zh/tr dictionaries follow.
 */
export const EN_DICT: I18nDict = {
  // Settings
  'settings.title': 'Settings',
  'settings.audio': 'Audio',
  'settings.learning': 'Learning',
  'settings.feel': 'Feel',
  'settings.developer': 'Developer',
  'settings.language': 'Language',
  'settings.language.label': 'App language',
  'settings.language.description': 'Language used across the app UI. Independent of the course you study.',
  'settings.voice.label': 'Voice',
  'settings.voice.description': 'Voice used to read prompts in listening exercises.',
  'settings.voice.auto': 'Auto',
  'settings.voice.female': 'Female',
  'settings.voice.male': 'Male',
  'settings.speech_rate.label': 'Speech rate',
  'settings.speech_rate.description': 'Slow down for new languages or speed up to challenge yourself.',
  'settings.sound_effects.label': 'Sound effects',
  'settings.sound_effects.description': 'Short cues on correct / incorrect answers.',
  'settings.auto_play.label': 'Auto-play audio',
  'settings.auto_play.description': 'Play the audio clip automatically when a listening exercise opens.',
  'settings.daily_xp.label': 'Daily XP goal',
  'settings.daily_xp.description': 'Target XP for a complete day. Drives the streak banner.',
  'settings.daily_xp.suffix': '{n} XP',
  'settings.show_pinyin.label': 'Show pinyin',
  'settings.show_pinyin.description': 'Display pinyin under Chinese prompts in lessons and guides.',
  'settings.theme.label': 'Theme',
  'settings.theme.description': 'Light, dark, or follow your device.',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.animations.label': 'Animations',
  'settings.animations.description': 'Pulse rings, bounces, and other path animations.',
  'settings.haptics.label': 'Haptics',
  'settings.haptics.description': 'Vibration on correct / incorrect answers.',
  'settings.developer.unlock_all.label': 'Unlock everything',
  'settings.developer.unlock_all.description':
    "Reveals every mochi in the village and lets you open any lesson regardless of progress. Doesn't grant XP or mark anything complete — just disables the gating.",
  'settings.reset': 'Reset to defaults',
  'settings.reset.confirm.title': 'Reset settings?',
  'settings.reset.confirm.body': 'Restore all settings to their defaults.',
  'settings.reset.confirm.cancel': 'Cancel',
  'settings.reset.confirm.confirm': 'Reset',

  // Profile screen
  'profile.section.settings': 'Settings',
  'profile.section.practice': 'Practice',
  'profile.section.about': 'About',
  'profile.action.app_settings': 'App settings',
  'profile.action.switch_language': 'Switch course language',
  'profile.action.reset_progress': 'Reset progress',
  'profile.action.reset_profile': 'Reset profile',
  'profile.action.sign_out': 'Sign out',
  'profile.action.sign_in': 'Sign in with Google',
  'profile.about': 'Mochilang is a side project — friends and competitors are simulated for now. Real social features land later.',

  // Village
  'village.title': 'Mochi Village',
  'village.subtitle.next': 'Next mochi unlocks at {xp} XP — {remaining} to go.',
  'village.subtitle.complete': 'You unlocked the entire village. ✨',

  // Social (League + Friends merged tab)
  'social.tab.league': '🛡 League',
  'social.tab.friends': '👥 Friends',

  // Home / tab labels
  'tabs.home': 'Learn',
  'tabs.village': 'Village',
  'tabs.social': 'Social',
  'tabs.profile': 'Profile',
  'home.hero.eyebrow': '{level} · Topic {n} of {total}',
}
