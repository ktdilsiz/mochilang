import { isCJK, isJapaneseGlyph, type Token } from '@mochilang/dict';
import { tokenReadingLines } from './reading-presentation';
import type { JapaneseReadingMode } from '../state';

type Args = {
  tokens: Token[];
  hanziSize: number;
  pinyinSize: number;
  reservePinyinRow: boolean;
  viewWidth: number;
  viewHeight: number;
  japaneseReadingMode?: JapaneseReadingMode;
};
const OPENING = new Set([...'（(「『【〈《〔｛{［[']);
const CLOSING = new Set([...'、。，．！？!?：；:;)]}）」』】〉》〕］｝ーぁぃぅぇぉっゃゅょァィゥェォッャュョ']);
export function textWidth(text: string, size: number): number {
  let width = 0;
  for (const char of text) width += (isCJK(char) || isJapaneseGlyph(char) || /[\u3000-\u303f\uff01-\uff60]/.test(char) || char.codePointAt(0)! > 0xffff) ? size : size * 0.55;
  return width;
}

export function tokenWidth(token: Token, size: number, readingSize: number, showReadings: boolean, mode?: JapaneseReadingMode): number {
  if (token.word === '\n') return 0;
  const ruby = token.japanese?.ruby;
  const width = mode && mode !== 'kana'
    ? Math.max(textWidth(token.word, size), showReadings ? Math.max(0, ...tokenReadingLines(token, mode).map((line) => textWidth(line, readingSize))) : 0)
    : ruby
    ? ruby.reduce((sum, part) => sum + Math.max(textWidth(part.text, size), showReadings ? textWidth(part.reading, readingSize) : 0), 0)
    : Math.max(textWidth(token.word, size), showReadings ? textWidth(token.pinyin, readingSize) : 0);
  return width + (isCJK(token.word[0] ?? '') || isJapaneseGlyph(token.word[0] ?? '') ? 6 : 0);
}

/** Layout and rendering share these exact lines; punctuation travels with its
 * neighbour so a soft line/page cannot start with 。 or end with 「. */
export function paginateLines({ tokens, hanziSize, pinyinSize, reservePinyinRow, viewWidth, viewHeight, japaneseReadingMode }: Args): Token[][][] {
  if (viewWidth <= 0 || viewHeight <= 0) return [[tokens]];
  const groups: Token[][] = [];
  for (const token of tokens) {
    const previous = groups[groups.length - 1];
    const previousText = previous?.map((part) => part.word).join('') ?? '';
    if (token.word !== '\n' && previous && !previousText.endsWith('\n') &&
        (CLOSING.has([...token.word][0]) || OPENING.has([...previousText].at(-1)!))) previous.push(token);
    else groups.push([token]);
  }
  const height = Math.round(hanziSize * 1.25 + (reservePinyinRow ? (pinyinSize + 2) * (japaneseReadingMode === 'both' ? 2 : 1) : 0) + 8);
  const limit = Math.max(1, Math.floor(viewHeight / height));
  const pages: Token[][][] = [];
  let page: Token[][] = [], line: Token[] = [], width = 0;
  const finish = () => {
    page.push(line); line = []; width = 0;
    if (page.length >= limit) { pages.push(page); page = []; }
  };
  for (const group of groups) {
    if (group[0].word === '\n') { line.push(...group); finish(); continue; }
    const nextWidth = group.reduce((sum, token) => sum + tokenWidth(token, hanziSize, pinyinSize, reservePinyinRow, japaneseReadingMode), 0);
    if (line.length && width + nextWidth > viewWidth) finish();
    line.push(...group); width += nextWidth;
  }
  if (line.length) finish();
  if (page.length) pages.push(page);
  return pages.length ? pages : [[[]]];
}

export function paginate(args: Args): Token[][] {
  return paginateLines(args).map((page) => page.flat());
}
