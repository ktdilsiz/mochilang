export const READING_LANGUAGES = ['ja', 'zh', 'es'] as const;
export type ReadingLanguage = typeof READING_LANGUAGES[number];
export const isReadingLanguage = (value: unknown): value is ReadingLanguage => READING_LANGUAGES.some((language) => language === value);
export const LANGUAGE_INFO = {
  zh: { name: 'Chinese', script: '中文', locale: 'zh-CN', sample: '你好，世界！我喜欢吃苹果。今天天气很好。' },
  ja: { name: 'Japanese', script: '日本語', locale: 'ja-JP', sample: 'こんにちは、世界！今日はいい天気です。日本語を読んでみましょう。' },
  es: { name: 'Spanish', script: 'Español', locale: 'es-ES', sample: '¡Hola, mundo! Estoy aprendiendo español. Hoy hace buen tiempo.' },
} as const;
