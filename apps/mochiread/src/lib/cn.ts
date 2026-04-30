import { pinyin } from 'pinyin-pro';
import { isCJK, segmentText } from './segment';

export type Token = { word: string; pinyin: string };

export function tokenize(text: string): Token[] {
  const segments = segmentText(text);
  return segments.map((seg) => {
    if (!isCJK(seg[0] ?? '')) {
      return { word: seg, pinyin: seg };
    }
    const py = pinyin(seg, { toneType: 'symbol', type: 'string' }).replace(
      /\s+/g,
      ''
    );
    return { word: seg, pinyin: py };
  });
}

export function isChinese(s: string): boolean {
  return isCJK(s[0] ?? '');
}
