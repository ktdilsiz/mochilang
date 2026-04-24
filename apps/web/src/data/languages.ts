import type { Language } from '../types'

export const LANGUAGES: Language[] = [
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', available: true },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', available: false },
  { code: 'fr', name: 'French', flag: '🇫🇷', available: false },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', available: false },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', available: false },
  { code: 'de', name: 'German', flag: '🇩🇪', available: false },
]

export const NATIVE_LANGUAGE: Language = {
  code: 'en',
  name: 'English',
  flag: '🇺🇸',
  available: true,
}

export const APP_NAME = 'MochiLang'
export const MASCOT_NAME = 'Mochi'
