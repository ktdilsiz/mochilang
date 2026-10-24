import { isReadableWord, type Token, type TextLanguage } from '@mochilang/dict';

export type SpeechSegment = { text: string; start: number; end: number; offsets: number[] };

/** Each utterance owns one highlighted word, independent of voice boundary
 * support. Use the selected dictionary reading, including particle sounds. */
export function readAlongSegments(tokens: Token[], language: TextLanguage): SpeechSegment[] {
  const segments: SpeechSegment[] = [];
  let prefix = '';
  tokens.forEach((token, index) => {
    const readable = isReadableWord(token.word, language) || (language === 'ja' && /[\p{L}\p{N}]/u.test(token.word));
    if (!readable) {
      if (/^[「『（(【]+$/u.test(token.word)) prefix += token.word;
      else if (segments.length) segments[segments.length - 1].text += token.word;
      else prefix += token.word;
      return;
    }
    let spoken = language === 'ja' ? token.pinyin || token.word : token.word;
    if (language === 'ja' && token.japanese?.senses.some((sense) => sense.partsOfSpeech.includes('prt'))) {
      spoken = ({ は: 'わ', へ: 'え', を: 'お' } as Record<string, string>)[token.word] ?? spoken;
    }
    segments.push({ text: prefix + spoken, start: index, end: index, offsets: [0] });
    prefix = '';
  });
  if (prefix && segments.length) segments[segments.length - 1].text += prefix;
  return segments;
}

/** Ignore out-of-range/end-of-utterance positions instead of clamping them to
 * the sentence's final word. Punctuation isn't a spoken-word highlight. */
export function boundaryRange(segment: SpeechSegment, tokens: Token[], charIndex: number, charLength = 1): [number, number] | null {
  if (!Number.isFinite(charIndex) || charIndex < 0 || charIndex >= segment.text.length) return null;
  const endOffset = Math.min(segment.text.length, charIndex + Math.max(1, charLength));
  const indices = segment.offsets.flatMap((offset, relative) => {
    const token = tokens[segment.start + relative];
    return token && offset < endOffset && offset + token.word.length > charIndex && /[\p{L}\p{N}]/u.test(token.word) ? [segment.start + relative] : [];
  });
  return indices.length ? [indices[0], indices[indices.length - 1]] : null;
}

/** Original punctuation and mixed scripts travel to TTS with their sentence. */
export function speechSegments(tokens: Token[], language: TextLanguage): SpeechSegment[] {
  if (language === 'zh') return tokens.flatMap((token, i) =>
    isReadableWord(token.word, language) ? [{ text: token.word, start: i, end: i, offsets: [0] }] : []
  );
  const segments: SpeechSegment[] = [];
  let current: SpeechSegment = { text: '', start: 0, end: 0, offsets: [] };
  let sentenceEnded = false;
  const finish = () => {
    if (current.text.length) segments.push(current);
    current = { text: '', start: current.end + 1, end: current.end + 1, offsets: [] };
    sentenceEnded = false;
  };
  tokens.forEach((token, index) => {
    if (current.text.length > 0 && current.text.length + token.word.length > 500) finish();
    if (!current.text) current.start = index;
    current.offsets.push(current.text.length);
    current.text += token.word;
    current.end = index;
    sentenceEnded ||= /[。！？!?]/u.test(token.word);
    const nextIsClosingQuote = /^[」』）)】〉》]+$/u.test(tokens[index + 1]?.word ?? '');
    if (/\n/u.test(token.word) || (sentenceEnded && !nextIsClosingQuote)) finish();
  });
  finish();
  return segments;
}

export function sentenceForToken(tokens: Token[], index: number): string {
  const segment = speechSegments(tokens, 'ja').find((part) => part.start <= index && part.end >= index);
  return segment?.text.trim() ?? tokens[index]?.word ?? '';
}
