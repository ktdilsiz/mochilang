/**
 * Forgiving comparison between learner input and an exercise's accepted
 * answers. The goal is to accept the learner's *meaning* without
 * letting keyboard-induced typography variants count as wrong.
 *
 * What we normalize away (both sides):
 *   - Unicode form (NFKC), so:
 *       · composed/decomposed accents match
 *       · full-width Latin letters typed on a Chinese IME (Ｈｅｌｌｏ)
 *         fold to ASCII (Hello)
 *       · full-width digits/punctuation (？ ！ ， ． （） etc) fold to
 *         their half-width ASCII equivalents
 *   - Letter case
 *   - Smart quotes (' ' " " „ « » → ' ")
 *   - Dash variants (en/em/figure/non-breaking dash → ASCII hyphen)
 *   - Ellipsis (… → ...)
 *   - CJK-only punctuation NFKC leaves alone (、 。 「」 『』 【】)
 *   - Repeated whitespace (incl. ideographic space U+3000), leading
 *     and trailing whitespace
 *
 * What we DON'T touch:
 *   - Diacritics / tone marks — they're meaningful for many languages
 *   - Trailing punctuation — "Where are you" vs "Where are you?" still
 *     differ in meaning, so we keep that strict
 *   - Word order, spelling — those are content, not typography
 *
 * Both the primary `answer` and every entry in `acceptableAnswers` are
 * normalized the same way before being compared, so authors can write
 * canonical forms and learners can type whatever their keyboard produced.
 */

import type { FillBlankExercise } from './types'

/**
 * Single-character substitutions that NFKC doesn't already handle.
 * Mostly typographic punctuation that survives NFKC unchanged but is
 * the same "meaning" as a simpler ASCII variant.
 */
const PUNCT_MAP: Record<string, string> = {
  // Quotes — curly, low, guillemet, modifier-letter → straight ASCII
  '‘': "'", // ‘
  '’': "'", // ’
  'ʼ': "'", // ʼ (modifier letter apostrophe)
  '´': "'", // ´
  '`': "'",
  '“': '"', // “
  '”': '"', // ”
  '„': '"', // „
  '«': '"', // «
  '»': '"', // »

  // Dashes — every variant we can think of → ASCII hyphen
  '‐': '-', // ‐
  '‑': '-', // ‑ (non-breaking hyphen)
  '‒': '-', // ‒ (figure dash)
  '–': '-', // –
  '—': '-', // —
  '―': '-', // ―
  '−': '-', // − (math minus sign)
  '﹣': '-', // ﹣ (small hyphen-minus)

  // CJK-only punctuation that NFKC doesn't fold to ASCII
  '、': ',', // 、
  '。': '.', // 。
  '「': '"', // 「
  '」': '"', // 」
  '『': '"', // 『
  '』': '"', // 』
  '【': '[', // 【
  '】': ']', // 】
}

const PUNCT_RE = new RegExp(
  '[' + Object.keys(PUNCT_MAP).join('') + ']',
  'g'
)

/**
 * Canonicalize a learner-typed string so it can be compared to an
 * accepted answer. Idempotent: `normalize(normalize(x)) === normalize(x)`.
 */
export function normalizeAnswer(input: string): string {
  let s = input.normalize('NFKC').toLowerCase()
  s = s.replace(PUNCT_RE, (ch) => PUNCT_MAP[ch] ?? ch)
  s = s.replace(/…/g, '...') // … → ...
  // Collapse all whitespace runs (incl. CJK ideographic space U+3000)
  // into a single ASCII space, then trim.
  s = s.replace(/[\s　]+/g, ' ').trim()
  // Drop spaces immediately before ASCII punctuation. tap_words_in_order
  // joins tokens with " " so a built sentence ends up as "Hello world ."
  // and we want that to match a canonical "Hello world." answer.
  s = s.replace(/ +([.,!?;:'")\]}])/g, '$1')
  // Drop whitespace between CJK characters. Chinese/Japanese/Korean
  // answers don't word-segment with spaces, so "你 好" should match "你好".
  s = s.replace(/([㐀-鿿])\s+([㐀-鿿])/g, '$1$2')
  return s
}

/**
 * Returns true when the learner's input matches the exercise's primary
 * answer or any acceptable variant after both are normalized. Empty
 * input never matches (callers typically guard with `value.length > 0`
 * before grading; this is a belt-and-braces check).
 */
export function matchesAnswer(
  input: string,
  exercise: FillBlankExercise
): boolean {
  const normalized = normalizeAnswer(input)
  if (normalized.length === 0) return false
  if (normalized === normalizeAnswer(exercise.answer)) return true
  for (const alt of exercise.acceptableAnswers ?? []) {
    if (normalized === normalizeAnswer(alt)) return true
  }
  return false
}

/**
 * Same idea, but for the tap-words exercise where the learner builds a
 * string from a fixed bank. The bank prevents typo-style variance, but
 * the joining logic might emit slightly different whitespace, so we
 * still normalize to be consistent with FillBlank grading.
 */
export function matchesSequenceAnswer(input: string, answer: string): boolean {
  const normalized = normalizeAnswer(input)
  if (normalized.length === 0) return false
  return normalized === normalizeAnswer(answer)
}
