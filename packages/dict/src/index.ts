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
import dictEnTr from './data/bilingual/en-tr.json';
import dictEsEn from './data/bilingual/es-en.json';
import dictEnEs from './data/bilingual/en-es.json';
import dictEnZh from './data/bilingual/en-zh.json';

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

/**
 * Static import map for the bilingual dictionaries. Top-level
 * imports are easier on Metro/web than lazy `require()` inside a
 * function — the JSON inlines into the bundle but JS engines on
 * mobile only parse the objects on first reference, so the cost
 * profile stays similar to lazy loading.
 *
 * zh-en and zh-tw-en both reuse the main CC-CEDICT (DICT), which
 * was extended to also key by Traditional characters.
 */
const BILINGUAL_DICTS: Record<string, BilingualDict> = {
  'zh-en': DICT,
  'zh-tw-en': DICT,
  'en-tr': dictEnTr as BilingualDict,
  'es-en': dictEsEn as BilingualDict,
  'en-es': dictEnEs as BilingualDict,
  'en-zh': dictEnZh as BilingualDict,
};

function getBilingual(from: string, to: string): BilingualDict | null {
  return BILINGUAL_DICTS[`${from}-${to}`] ?? null;
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
