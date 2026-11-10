export type FontSize = 'sm' | 'md' | 'lg' | 'xl' | number;
export type SpeechRate = 'slow' | 'normal' | 'fast';
export type PagePlayback = 'word' | 'sentence';
export type PinyinMode = 'on' | 'off' | 'hint';
export type { ReadingLanguage } from './languages';
import type { ReadingLanguage } from './languages';
export type JapaneseReadingMode = 'kana' | 'romaji' | 'both';

export type ThemeMode = 'system' | 'light' | 'dark';

export type Preferences = {
  fontSize: FontSize;
  pinyinMode: PinyinMode;
  japaneseReadingMode: JapaneseReadingMode;
  showToneColors: boolean;
  themeMode: ThemeMode;
  speechRate: SpeechRate;
  pagePlayback: PagePlayback;
  autoPlay: boolean;
  voiceId?: string;
  japaneseVoiceId?: string;
};

export type LibraryEntry = {
  id: string;
  title: string;
  text: string;
  language: ReadingLanguage;
  createdAt: number;
};

export type DayStats = {
  /** Local-day ISO key, e.g. "2026-05-01". */
  date: string;
  wordTaps: number;
  secondsRead: number;
};

export type VocabEntry = {
  word: string;
  language: ReadingLanguage;
  pinyin: string;
  meanings: string[];
  entryId?: string;
  examples?: { sentence: string; surface: string }[];
  savedAt: number;
  remembered: number;
  forgotten: number;
  lastReviewedAt?: number;
  /** SM-2 ease factor; starts at 2.5, floored at 1.3. */
  ease: number;
  /** SM-2 interval in days. 0 = never reviewed. */
  intervalDays: number;
  /** Timestamp (ms) when the card is next due for review. */
  dueAt: number;
};
