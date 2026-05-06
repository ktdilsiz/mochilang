/**
 * Shared Chinese dictionary + segmentation tooling for the mochilang
 * monorepo. Wraps:
 *
 * - CC-CEDICT lookup (bundled `dict.json`, simplified-keyed)
 * - Forward-maximum-matching segmenter using the dictionary as the lexicon
 * - Pinyin generation (via `pinyin-pro`) per segmented word, with tones
 *
 * Pure data + functions, no React / RN / DOM dependencies, so the same code
 * runs in mochiread (Expo) and mochilang (Vite/web).
 */
import { pinyin, getNumOfTone } from 'pinyin-pro';
import data from './data/dict.json';

// --- Dictionary lookup -------------------------------------------------------

export type Definition = {
  word: string;
  meanings: string[];
};

const DICT = data as Record<string, string[]>;

export function lookup(word: string): Definition | null {
  const meanings = DICT[word];
  if (!meanings) return null;
  return { word, meanings };
}

// --- Character class detection ----------------------------------------------

const CJK_RE = /[㐀-䶿一-鿿]/;

export function isCJK(ch: string): boolean {
  return CJK_RE.test(ch);
}

export function isChinese(s: string): boolean {
  return isCJK(s[0] ?? '');
}

// --- Segmentation ------------------------------------------------------------

const MAX_WORD_LEN = 8;

/**
 * Forward maximum-matching segmenter over CC-CEDICT.
 *
 * Walks the text left-to-right; at each Chinese character, picks the longest
 * dictionary entry that starts there. Falls back to a single character when no
 * multi-char word matches. Non-Chinese runs (punctuation, latin, digits) are
 * emitted as one chunk each, with newlines kept as their own tokens so
 * consumers can render line breaks.
 */
export function segmentText(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (ch === '\n') {
      out.push('\n');
      i++;
      continue;
    }

    if (!isCJK(ch)) {
      let j = i;
      while (j < n && text[j] !== '\n' && !isCJK(text[j])) j++;
      out.push(text.slice(i, j));
      i = j;
      continue;
    }

    const maxLen = Math.min(MAX_WORD_LEN, n - i);
    let matched: string | null = null;
    for (let len = maxLen; len >= 2; len--) {
      const candidate = text.slice(i, i + len);
      if (!allCJK(candidate)) continue;
      if (DICT[candidate] !== undefined) {
        matched = candidate;
        break;
      }
    }
    if (matched) {
      out.push(matched);
      i += matched.length;
    } else {
      out.push(ch);
      i++;
    }
  }

  return out;
}

function allCJK(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (!CJK_RE.test(s[i])) return false;
  }
  return true;
}

// --- Tokenize with pinyin + per-syllable tone -------------------------------

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
    return { word: seg, pinyin: arr.join(''), syllables };
  });
}
