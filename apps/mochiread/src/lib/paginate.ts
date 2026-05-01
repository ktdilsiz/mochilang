import type { Token } from './cn';
import { isCJK } from './segment';

type Args = {
  tokens: Token[];
  hanziSize: number;
  pinyinSize: number;
  /** Reserve vertical space for pinyin (or its hidden-hint underline). */
  reservePinyinRow: boolean;
  viewWidth: number;
  viewHeight: number;
};

const TOKEN_HORIZONTAL_PADDING = 6; // matches paddingHorizontal: 3 on each side

/**
 * Greedy pagination: pack tokens line-by-line, fill pages line-by-line.
 *
 * Token widths are estimated from font size + character class (CJK glyphs are
 * ~square; ASCII is ~55% as wide). Line height includes the pinyin row when
 * it's enabled. Hard newlines (`\n` tokens) end the current line.
 */
export function paginate({
  tokens,
  hanziSize,
  pinyinSize,
  reservePinyinRow,
  viewWidth,
  viewHeight,
}: Args): Token[][] {
  if (viewWidth <= 0 || viewHeight <= 0) return [tokens];

  const lineHeight = Math.round(
    hanziSize * 1.25 + (reservePinyinRow ? pinyinSize + 2 : 0) + 8
  );
  const linesPerPage = Math.max(1, Math.floor(viewHeight / lineHeight));

  const pages: Token[][] = [];
  let pageBuf: Token[] = [];
  let lineBuf: Token[] = [];
  let lineWidth = 0;
  let lineIndex = 0;

  const finishLine = () => {
    pageBuf.push(...lineBuf);
    lineBuf = [];
    lineWidth = 0;
    lineIndex++;
    if (lineIndex >= linesPerPage) {
      pages.push(pageBuf);
      pageBuf = [];
      lineIndex = 0;
    }
  };

  for (const t of tokens) {
    if (t.word === '\n') {
      finishLine();
      continue;
    }
    const w = estimateWidth(t.word, hanziSize);
    if (w + lineWidth > viewWidth && lineBuf.length > 0) {
      finishLine();
    }
    lineBuf.push(t);
    lineWidth += w;
  }

  if (lineBuf.length > 0) finishLine();
  if (pageBuf.length > 0) pages.push(pageBuf);
  if (pages.length === 0) pages.push([]);

  return pages;
}

function estimateWidth(word: string, hanziSize: number): number {
  let w = 0;
  for (const ch of word) {
    w += isCJK(ch) ? hanziSize : hanziSize * 0.55;
  }
  return w + TOKEN_HORIZONTAL_PADDING;
}
