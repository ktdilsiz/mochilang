/**
 * Shared bilingual dictionary + Chinese segmentation tooling for the
 * mochilang monorepo. Provides:
 *
 * - CC-CEDICT lookup for zh→en (bundled `dict.json`, simplified-keyed)
 * - Bilingual lookups for other course-pair directions
 *   (en-tr / es-en / en-es / en-zh) sourced from FreeDict + inverted
 *   CC-CEDICT, lazy-loaded per pair so the app's startup cost doesn't
 *   pay for dictionaries the active course will never use.
 * - Forward-maximum-matching segmenter using CC-CEDICT as the lexicon
 * - Pinyin generation (via `pinyin-pro`) per segmented word, with tones
 *
 * Pure data + functions, no React / RN / DOM dependencies, so the same
 * code runs in mochiread (Expo) and mochilang (Vite/web).
 */
import { pinyin, getNumOfTone } from 'pinyin-pro';
import data from './data/dict.json';

// --- Dictionary lookup -------------------------------------------------------

export type Definition = {
  word: string;
  meanings: string[];
};

const DICT = data as Record<string, string[]>;

/**
 * Lookup a Chinese (simplified) word in CC-CEDICT. Kept for the
 * existing segmenter / mochiread paths that key off the legacy
 * single-direction API. New callers should prefer the multi-pair
 * `lookupBilingual(word, from, to)` below.
 */
export function lookup(word: string): Definition | null {
  const meanings = DICT[word];
  if (!meanings) return null;
  return { word, meanings };
}

// --- Bilingual (lazy-loaded per pair) ---------------------------------------

type BilingualDict = Record<string, string[]>;
const bilingualCache: Partial<Record<string, BilingualDict | null>> = {};

/**
 * Synchronously load (and memoise) the dictionary for one direction.
 * Each require() bundles the JSON into Metro's chunk graph but defers
 * the JSON.parse cost to the first lookup of that direction. Returns
 * null when we don't ship a dict for that direction.
 */
function getBilingual(from: string, to: string): BilingualDict | null {
  const key = `${from}-${to}`;
  if (key in bilingualCache) return bilingualCache[key] ?? null;
  let data: BilingualDict | null = null;
  switch (key) {
    case 'zh-en':
    case 'zh-tw-en':
      // CC-CEDICT now carries both Simplified and Traditional keys
      // (Traditional aliases mapped to the same meanings), so the
      // Taiwanese course reuses it.
      data = DICT;
      break;
    case 'en-tr':
      data = require('./data/bilingual/en-tr.json') as BilingualDict;
      break;
    case 'es-en':
      data = require('./data/bilingual/es-en.json') as BilingualDict;
      break;
    case 'en-es':
      data = require('./data/bilingual/en-es.json') as BilingualDict;
      break;
    case 'en-zh':
      data = require('./data/bilingual/en-zh.json') as BilingualDict;
      break;
    default:
      data = null;
  }
  bilingualCache[key] = data;
  return data;
}

/**
 * Look up a word's meanings in the dictionary for the given direction.
 * Falls back to a lowercase lookup for case-insensitive matches; CJK
 * sources are case-blind and CC-CEDICT keys are already simplified.
 *
 * Returns null when:
 *   - No dictionary exists for that direction (e.g. fr-en today)
 *   - The word isn't present in the bundled dict
 *
 * Lingva / online translation handles the long tail.
 */
export function lookupBilingual(
  word: string,
  from: string,
  to: string,
): Definition | null {
  const dict = getBilingual(from, to);
  if (!dict) return null;
  const meanings = dict[word] ?? dict[word.toLowerCase()];
  if (!meanings || meanings.length === 0) return null;
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
