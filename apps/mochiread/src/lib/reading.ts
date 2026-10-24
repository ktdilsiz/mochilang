import { isReadableWord, type Token, type TextLanguage } from '@mochilang/dict';

export type SpeechSegment = { text: string; start: number; end: number; offsets: number[] };

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
