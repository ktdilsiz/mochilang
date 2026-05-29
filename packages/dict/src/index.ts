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

// --- Dictionary lookup -------------------------------------------------------

export type Definition = {
  word: string;
  meanings: string[];
};

/**
 * CC-CEDICT after adding Traditional aliases has ~197k entries,
 * which crashes Hermes ("Property storage exceeds 196607 properties").
 * The dict is sharded into 4 files of ~50k entries each; we load all
 * shards on first call and merge into a Map. Maps have no property
 * cap so this is bulletproof, and lookups stay O(1).
 *
 * Lazy-loaded — the JSON shards only parse on first call to
 * loadCEDICT() / loadCEDICTLookup(), keeping startup light for
 * non-Chinese courses.
 */
let _cedictMap: Map<string, string[]> | null = null;
function loadCEDICT(): Map<string, string[]> {
  if (_cedictMap) return _cedictMap;
  const shards: Record<string, string[]>[] = [
    require('./data/dict-0.json'),
    require('./data/dict-1.json'),
    require('./data/dict-2.json'),
    require('./data/dict-3.json'),
  ];
  const m = new Map<string, string[]>();
  for (const shard of shards) {
    for (const k of Object.keys(shard)) {
      m.set(k, shard[k]);
    }
  }
  _cedictMap = m;
  return m;
}

/**
 * Lookup a Chinese word in CC-CEDICT (covers both Simplified and
 * Traditional after the alias pass). Kept for the existing segmenter
 * / mochiread paths that key off the legacy single-direction API.
 * New callers should prefer the multi-pair `lookupBilingual(word,
 * from, to)` below.
 */
export function lookup(word: string): Definition | null {
  const meanings = loadCEDICT().get(word);
  if (!meanings) return null;
  return { word, meanings };
}

// --- Bilingual (lazy-loaded per pair) ---------------------------------------

type BilingualMap = Map<string, string[]>;

/**
 * Lazy-loaded per direction. Each require() is picked up by Metro at
 * bundle time; the JSON parses on first lookup of that direction.
 * We convert the parsed object into a Map immediately so subsequent
 * lookups don't hit the Hermes property-storage cap, and to keep all
 * dicts using the same return type as CC-CEDICT.
 */
const bilingualCache: Map<string, BilingualMap | null> = new Map();

function objectToMap(o: Record<string, string[]>): BilingualMap {
  const m = new Map<string, string[]>();
  for (const k of Object.keys(o)) m.set(k, o[k]);
  return m;
}

function getBilingual(from: string, to: string): BilingualMap | null {
  const key = `${from}-${to}`;
  if (bilingualCache.has(key)) return bilingualCache.get(key) ?? null;
  let dict: BilingualMap | null = null;
  switch (key) {
    case 'zh-en':
    case 'zh-tw-en':
      // CC-CEDICT (sharded) carries both Simplified and Traditional.
      dict = loadCEDICT();
      break;
    case 'en-tr':
      dict = objectToMap(require('./data/bilingual/en-tr.json'));
      break;
    case 'es-en':
      dict = objectToMap(require('./data/bilingual/es-en.json'));
      break;
    case 'en-es':
      dict = objectToMap(require('./data/bilingual/en-es.json'));
      break;
    case 'en-zh':
      dict = objectToMap(require('./data/bilingual/en-zh.json'));
      break;
    default:
      dict = null;
  }
  bilingualCache.set(key, dict);
  return dict;
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
  const meanings = dict.get(word) ?? dict.get(word.toLowerCase());
  if (!meanings || meanings.length === 0) return null;
  return { word, meanings };
}

// --- Character class detection ----------------------------------------------

const CJK_RE = /[㐀-䶿一-鿿]/;

export function isCJK(ch: string): boolean {
  return CJK_RE.test(ch);
}

/**
 * Generate pinyin for a Chinese (or partially-Chinese) string.
 * Strips non-CJK runs out of the result, returns null when the input
 * has no Chinese characters. Useful for adding pinyin to translation
 * results in the popup card.
 */
export function pinyinFor(text: string): string | null {
  if (!CJK_RE.test(text)) return null;
  const arr = pinyin(text, {
    toneType: 'symbol',
    type: 'array',
    nonZh: 'removed',
  }) as string[];
  const joined = arr.filter((p) => p.length > 0).join(' ');
  return joined.length > 0 ? joined : null;
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
    const cedict = loadCEDICT();
    for (let len = maxLen; len >= 2; len--) {
      const candidate = text.slice(i, i + len);
      if (!allCJK(candidate)) continue;
      if (cedict.has(candidate)) {
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
