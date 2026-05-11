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

/**
 * Bundled Chinese dictionary. Mirrors apps/api/internal/i18n/data/zh.json
 * so the app stays localized when running offline (no API reachable
 * for `GET /api/i18n/zh`). Keep the two in sync when editing.
 */
export const ZH_DICT: I18nDict = {
  'settings.title': '设置',
  'settings.audio': '音频',
  'settings.learning': '学习',
  'settings.feel': '界面',
  'settings.developer': '开发者',
  'settings.language': '语言',
  'settings.language.label': '应用语言',
  'settings.language.description': '应用界面使用的语言。与你学习的课程无关。',
  'settings.voice.label': '语音',
  'settings.voice.description': '听力练习中朗读提示的语音。',
  'settings.voice.auto': '自动',
  'settings.voice.female': '女声',
  'settings.voice.male': '男声',
  'settings.speech_rate.label': '语速',
  'settings.speech_rate.description': '新语言可以放慢,熟练后可以加快挑战自己。',
  'settings.sound_effects.label': '音效',
  'settings.sound_effects.description': '答对 / 答错时的短促提示音。',
  'settings.auto_play.label': '自动播放音频',
  'settings.auto_play.description': '听力题打开时自动播放音频。',
  'settings.daily_xp.label': '每日 XP 目标',
  'settings.daily_xp.description': '每天的 XP 目标。会驱动连胜横幅。',
  'settings.daily_xp.suffix': '{n} XP',
  'settings.show_pinyin.label': '显示拼音',
  'settings.show_pinyin.description': '在中文提示和指南下方显示拼音。',
  'settings.theme.label': '主题',
  'settings.theme.description': '浅色、深色,或跟随设备。',
  'settings.theme.system': '跟随系统',
  'settings.theme.light': '浅色',
  'settings.theme.dark': '深色',
  'settings.animations.label': '动画',
  'settings.animations.description': '脉冲圈、弹跳和其他路径动画。',
  'settings.haptics.label': '触感反馈',
  'settings.haptics.description': '答对 / 答错时的振动反馈。',
  'settings.developer.unlock_all.label': '解锁全部',
  'settings.developer.unlock_all.description':
    '解锁村庄里的所有 Mochi,并允许在不论进度的情况下打开任何课程。不会授予 XP 或标记完成 —— 只是关闭门槛检查。',
  'settings.reset': '恢复默认',
  'settings.reset.confirm.title': '重置设置吗?',
  'settings.reset.confirm.body': '将所有设置恢复为默认值。',
  'settings.reset.confirm.cancel': '取消',
  'settings.reset.confirm.confirm': '重置',
  'profile.section.settings': '设置',
  'profile.section.practice': '练习',
  'profile.section.about': '关于',
  'profile.action.app_settings': '应用设置',
  'profile.action.switch_language': '切换课程语言',
  'profile.action.reset_progress': '重置进度',
  'profile.action.reset_profile': '重置个人资料',
  'profile.action.sign_out': '退出登录',
  'profile.action.sign_in': '用 Google 登录',
  'profile.about':
    'Mochilang 是一个个人项目 —— 好友和对手暂时都是模拟的。真实社交功能稍后推出。',
  'village.title': 'Mochi 村',
  'village.subtitle.next': '下一只 mochi 将在 {xp} XP 解锁 —— 还差 {remaining}。',
  'village.subtitle.complete': '你已解锁整个村庄。✨',
  'social.tab.league': '🛡 联盟',
  'social.tab.friends': '👥 好友',
  'tabs.home': '学习',
  'tabs.village': '村庄',
  'tabs.social': '社交',
  'tabs.profile': '我的',
  'home.hero.eyebrow': '{level} · 第 {n} 课题 / 共 {total}',
}

/**
 * Bundled Turkish dictionary. Mirrors apps/api/internal/i18n/data/tr.json.
 */
export const TR_DICT: I18nDict = {
  'settings.title': 'Ayarlar',
  'settings.audio': 'Ses',
  'settings.learning': 'Öğrenme',
  'settings.feel': 'Görünüm',
  'settings.developer': 'Geliştirici',
  'settings.language': 'Dil',
  'settings.language.label': 'Uygulama dili',
  'settings.language.description':
    'Uygulama arayüzünde kullanılan dil. Çalıştığınız kurstan bağımsızdır.',
  'settings.voice.label': 'Ses',
  'settings.voice.description': 'Dinleme alıştırmalarında soruları okuyan ses.',
  'settings.voice.auto': 'Otomatik',
  'settings.voice.female': 'Kadın',
  'settings.voice.male': 'Erkek',
  'settings.speech_rate.label': 'Konuşma hızı',
  'settings.speech_rate.description':
    'Yeni dillerde yavaşlatın, kendinize meydan okumak için hızlandırın.',
  'settings.sound_effects.label': 'Ses efektleri',
  'settings.sound_effects.description': 'Doğru / yanlış cevaplarda kısa ses uyarıları.',
  'settings.auto_play.label': 'Sesi otomatik oynat',
  'settings.auto_play.description':
    'Dinleme alıştırması açıldığında ses kaydı otomatik çalsın.',
  'settings.daily_xp.label': 'Günlük XP hedefi',
  'settings.daily_xp.description':
    'Tamamlanmış bir gün için hedef XP. Seri bandını besler.',
  'settings.daily_xp.suffix': '{n} XP',
  'settings.show_pinyin.label': 'Pinyin göster',
  'settings.show_pinyin.description': 'Çince sorulara ve rehberlere pinyin ekle.',
  'settings.theme.label': 'Tema',
  'settings.theme.description': 'Açık, koyu veya cihazı takip et.',
  'settings.theme.system': 'Sistem',
  'settings.theme.light': 'Açık',
  'settings.theme.dark': 'Koyu',
  'settings.animations.label': 'Animasyonlar',
  'settings.animations.description': 'Nabız halkaları, sıçramalar ve diğer yol animasyonları.',
  'settings.haptics.label': 'Titreşim',
  'settings.haptics.description': 'Doğru / yanlış cevaplarda titreşim.',
  'settings.developer.unlock_all.label': 'Her şeyin kilidini aç',
  'settings.developer.unlock_all.description':
    'Köydeki tüm mochileri açar ve ilerlemenden bağımsız olarak istediğin dersi açmana izin verir. XP vermez ve hiçbir şeyi tamamlanmış işaretlemez — sadece kilitleri kapatır.',
  'settings.reset': 'Varsayılana sıfırla',
  'settings.reset.confirm.title': 'Ayarlar sıfırlansın mı?',
  'settings.reset.confirm.body': 'Tüm ayarları varsayılan değerlere döndür.',
  'settings.reset.confirm.cancel': 'Vazgeç',
  'settings.reset.confirm.confirm': 'Sıfırla',
  'profile.section.settings': 'Ayarlar',
  'profile.section.practice': 'Pratik',
  'profile.section.about': 'Hakkında',
  'profile.action.app_settings': 'Uygulama ayarları',
  'profile.action.switch_language': 'Kurs dilini değiştir',
  'profile.action.reset_progress': 'İlerlemeyi sıfırla',
  'profile.action.reset_profile': 'Profili sıfırla',
  'profile.action.sign_out': 'Çıkış yap',
  'profile.action.sign_in': 'Google ile giriş yap',
  'profile.about':
    'Mochilang bir yan proje — arkadaşlar ve rakipler şimdilik simüle ediliyor. Gerçek sosyal özellikler sonra.',
  'village.title': 'Mochi Köyü',
  'village.subtitle.next': 'Bir sonraki mochi {xp} XP\'de açılır — {remaining} XP kaldı.',
  'village.subtitle.complete': 'Tüm köyün kilidini açtın. ✨',
  'social.tab.league': '🛡 Lig',
  'social.tab.friends': '👥 Arkadaşlar',
  'tabs.home': 'Öğren',
  'tabs.village': 'Köy',
  'tabs.social': 'Sosyal',
  'tabs.profile': 'Profil',
  'home.hero.eyebrow': '{level} · {total} konudan {n}. konu',
}

/**
 * All bundled locale dictionaries by code. The mobile provider seeds
 * its state from this synchronously so locale switches paint
 * instantly even when the device is offline; the API fetch runs in
 * the background to pick up edits without an app release.
 */
export const BUNDLED_DICTS: Record<UiLocale, I18nDict> = {
  en: EN_DICT,
  zh: ZH_DICT,
  tr: TR_DICT,
}
