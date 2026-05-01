import { pinyin, getNumOfTone } from 'pinyin-pro';
import { isCJK, segmentText } from './segment';

export type Syllable = { text: string; tone: number };
export type Token = {
  word: string;
  pinyin: string;
  /** Per-syllable pinyin + tone for CJK tokens; empty for plain text. */
  syllables: Syllable[];
};

export function tokenize(text: string): Token[] {
  const segments = segmentText(text);
  return segments.map((seg) => {
    if (!isCJK(seg[0] ?? '')) {
      return { word: seg, pinyin: seg, syllables: [] };
    }
    const arr = pinyin(seg, {
      toneType: 'symbol',
      type: 'array',
    }) as string[];
    const syllables: Syllable[] = arr.map((s) => {
      const raw = getNumOfTone(s);
      const tone = typeof raw === 'number' ? raw : Number(raw) || 0;
      return { text: s, tone };
    });
    const py = arr.join('');
    return { word: seg, pinyin: py, syllables };
  });
}

export function isChinese(s: string): boolean {
  return isCJK(s[0] ?? '');
}
