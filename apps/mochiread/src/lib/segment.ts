import dictData from '../data/dict.json';

const DICT = dictData as Record<string, string[]>;
const MAX_WORD_LEN = 8;

const CJK_RE = /[㐀-䶿一-鿿]/;

export function isCJK(ch: string): boolean {
  return CJK_RE.test(ch);
}

/**
 * Forward maximum-matching segmenter over CC-CEDICT.
 *
 * Walks the text left-to-right; at each Chinese character, picks the longest
 * dictionary entry that starts there. Falls back to a single character when no
 * multi-char word matches. Non-Chinese runs (punctuation, latin, digits) are
 * emitted as one chunk each, with newlines kept as their own tokens so the
 * reader can render line breaks.
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
