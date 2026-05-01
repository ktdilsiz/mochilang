import { useColorScheme } from 'react-native';
import { useStore, type ThemeMode } from './state';

export type Theme = {
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  accent: string;
  accentBg: string;
  accentBgPressed: string;
  highlight: string;
  destructive: string;
  destructiveBg: string;
  saved: string;
  savedBg: string;
  /** Pinyin color when tone coloring is off. */
  pinyin: string;
  hanzi: string;
  /** Per-tone colors used for syllable coloring. Index by tone number 0-5. */
  tones: Record<number, string>;
};

const lightTones: Record<number, string> = {
  0: '#9ca3af',
  1: '#dc2626',
  2: '#d97706',
  3: '#16a34a',
  4: '#2563eb',
  5: '#9ca3af',
};

const darkTones: Record<number, string> = {
  0: '#9ca3af',
  1: '#f87171',
  2: '#fbbf24',
  3: '#4ade80',
  4: '#60a5fa',
  5: '#9ca3af',
};

export const lightTheme: Theme = {
  isDark: false,
  bg: '#fafafa',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f6',
  text: '#111827',
  textMuted: '#6b7280',
  textSubtle: '#9ca3af',
  border: '#e5e7eb',
  accent: '#3b82f6',
  accentBg: '#eff6ff',
  accentBgPressed: '#dbeafe',
  highlight: '#fef3c7',
  destructive: '#dc2626',
  destructiveBg: '#fee2e2',
  saved: '#b45309',
  savedBg: '#fef3c7',
  pinyin: '#9ca3af',
  hanzi: '#111827',
  tones: lightTones,
};

export const darkTheme: Theme = {
  isDark: true,
  bg: '#0c0d12',
  surface: '#16181f',
  surfaceAlt: '#1f2230',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  textSubtle: '#6b7280',
  border: '#2a2d39',
  accent: '#60a5fa',
  accentBg: '#1e3a8a55',
  accentBgPressed: '#1e3a8a99',
  highlight: '#78350f',
  destructive: '#f87171',
  destructiveBg: '#7f1d1d66',
  saved: '#fbbf24',
  savedBg: '#78350f',
  pinyin: '#9ca3af',
  hanzi: '#f3f4f6',
  tones: darkTones,
};

export function resolveTheme(mode: ThemeMode, system: 'light' | 'dark' | null): Theme {
  if (mode === 'dark') return darkTheme;
  if (mode === 'light') return lightTheme;
  return system === 'dark' ? darkTheme : lightTheme;
}

export function useTheme(): Theme {
  const system = useColorScheme() ?? 'light';
  const { prefs } = useStore();
  return resolveTheme(prefs.themeMode, system);
}
