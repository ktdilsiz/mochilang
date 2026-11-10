import type { FontSize, SpeechRate } from '../../storage/schema';

export { DEFAULT_PREFS } from '../../storage/defaults';

export const SPEECH_RATE_VALUES: Record<SpeechRate, number> = {
  slow: 0.7,
  normal: 0.9,
  fast: 1.15,
};

export const FONT_SIZE_VALUES: Record<Exclude<FontSize, number>, number> = {
  sm: 22,
  md: 28,
  lg: 34,
  xl: 42,
};

export const PINYIN_SIZE_VALUES: Record<Exclude<FontSize, number>, number> = {
  sm: 11,
  md: 13,
  lg: 16,
  xl: 19,
};

export function getFontSizes(value: FontSize) {
  const text = typeof value === 'number'
    ? Math.round(Math.max(18, Math.min(48, Number.isFinite(value) ? value : 28)))
    : FONT_SIZE_VALUES[value] ?? 28;
  return { text, reading: Math.round(11 + (text - 22) * 0.4) };
}
