import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { isReadableWord, type Token } from '@mochilang/dict';
import { paginateLines, tokenWidth } from '../lib/paginate';
import { speechSegments, readAlongSegments, boundaryRange } from '../lib/reading';
import { tokenReadingLines } from '../lib/reading-presentation';
import { speakAsync, stop as stopSpeech } from '../lib/tts';
import {
  FONT_SIZE_VALUES,
  PINYIN_SIZE_VALUES,
  type FontSize,
  type PinyinMode,
  type ReadingLanguage,
  type PagePlayback,
  type JapaneseReadingMode,
} from '../state';
import { useTheme, type Theme } from '../theme';
import type { WordRect } from './ThoughtBubble';

type Props = {
  tokens: Token[];
  language: ReadingLanguage;
  fontSize: FontSize;
  pinyinMode: PinyinMode;
  japaneseReadingMode: JapaneseReadingMode;
  showToneColors: boolean;
  pagePlayback: PagePlayback;
  page: number;
  onPageChange: (page: number) => void;
  onWordPress: (token: Token, rect: WordRect) => void;
  onTranslate: (text: string) => void;
};

const PAGE_PADDING = 20;
const FOOTER_HEIGHT = 44;

export function Reader({
  tokens,
  language,
  fontSize,
  pinyinMode,
  japaneseReadingMode,
  showToneColors,
  pagePlayback,
  page,
  onPageChange,
  onWordPress,
  onTranslate,
}: Props) {
  const theme = useTheme();
  const hanziSize = FONT_SIZE_VALUES[fontSize];
  const pinyinSize = PINYIN_SIZE_VALUES[fontSize];
  const lineHeight = Math.round(hanziSize * 1.25);
  const reservePinyinRow = pinyinMode !== 'off';
  const readingMode = language === 'ja' ? japaneseReadingMode : undefined;
  const readingRows = readingMode === 'both' ? 2 : 1;

  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [playingRange, setPlayingRange] = useState<[number, number] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackRun = useRef(0);
  const stopPlayback = () => {
    playbackRun.current++;
    setIsPlaying(false);
    setPlayingRange(null);
    stopSpeech();
  };
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);

  // Clear selection on text change or page change.
  useEffect(() => {
    setSelection(null);
  }, [tokens]);
  useEffect(() => {
    setSelection(null);
  }, [page]);

  // Reset per-word reveals when the underlying text changes.
  useEffect(() => {
    setRevealed(new Set());
    setIsPlaying(false);
    setPlayingRange(null);
    stopSpeech();
  }, [tokens]);

  const pages = useMemo(() => {
    if (layout.width <= 0 || layout.height <= 0) return [[tokens]];
    return paginateLines({
      tokens,
      hanziSize,
      pinyinSize,
      reservePinyinRow,
      japaneseReadingMode: readingMode,
      viewWidth: layout.width - PAGE_PADDING * 2,
      viewHeight: layout.height - PAGE_PADDING * 2,
    });
  }, [tokens, hanziSize, pinyinSize, reservePinyinRow, readingMode, layout.width, layout.height]);

  const pageCount = pages.length;
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const currentLines = pages[safePage] ?? [];
  const currentTokens = useMemo(() => currentLines.flat(), [currentLines]);

  // Stop playback on unmount or when the page / tokens change.
  useEffect(() => {
    if (!isPlaying) return;
    const run = ++playbackRun.current;
    let cancelled = false;
    let i = 0;
    (async () => {
      const segments = pagePlayback === 'word' ? readAlongSegments(currentTokens, language) : speechSegments(currentTokens, language);
      while (!cancelled && run === playbackRun.current && i < segments.length) {
        const segment = segments[i];
        await speakAsync(segment.text, language, pagePlayback === 'word' ? undefined : (charIndex, charLength) => {
          if (cancelled || run !== playbackRun.current) return;
          const range = boundaryRange(segment, currentTokens, charIndex, charLength);
          if (range) setPlayingRange(range);
        }, () => {
          if (!cancelled && run === playbackRun.current) setPlayingRange([segment.start, segment.end]);
        });
        i++;
      }
      if (!cancelled && run === playbackRun.current) {
        setPlayingRange(null);
        setIsPlaying(false);
      }
    })();
    return () => {
      cancelled = true;
      stopSpeech();
    };
  }, [isPlaying, currentTokens, language, pagePlayback]);

  // Stop & reset when the page changes.
  useEffect(() => {
    setPlayingRange(null);
    setIsPlaying(false);
    stopSpeech();
  }, [safePage]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== layout.width || height !== layout.height) {
      setLayout({ width, height });
    }
  };

  const togglePlay = () => isPlaying ? stopPlayback() : setIsPlaying(true);

  // Split the page's tokens into "logical lines" delimited by \n. Each line
  // becomes its own row View; tokens within a line still wrap on overflow.
  // This is more reliable than trying to force a flex break with width:100%.
  const lines = currentLines.map((line) => ({ tokens: line }));

  // Map each rendered token back to its position in `currentTokens` so the
  // play loop can highlight the right one across split lines.
  let runningIndex = 0;

  const selStart = selection
    ? Math.min(selection.start, selection.end)
    : -1;
  const selEnd = selection ? Math.max(selection.start, selection.end) : -1;
  const isSelected = (i: number) => selStart <= i && i <= selEnd;
  const selectedText = selection
    ? currentTokens
        .slice(selStart, selEnd + 1)
        .map((t) => t.word)
        .join('')
    : '';

  const handleTokenPress = (
    token: Token,
    rect: WordRect,
    tokenIndex: number
  ) => {
    stopPlayback();
    if (selection) {
      // While selecting, taps extend the range instead of opening the bubble.
      setSelection({ start: selection.start, end: tokenIndex });
      return;
    }
    if (pinyinMode === 'hint' && !revealed.has(token.word)) {
      setRevealed((prev) => {
        const next = new Set(prev);
        next.add(token.word);
        return next;
      });
    }
    onWordPress(token, rect);
  };

  const handleTokenLongPress = (tokenIndex: number) => {
    stopPlayback();
    setSelection({ start: tokenIndex, end: tokenIndex });
  };

  const cancelSelection = () => setSelection(null);
  const submitSelection = () => {
    const text = selectedText;
    setSelection(null);
    if (text) onTranslate(text);
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <View style={s.page} onLayout={handleLayout}>
        <View style={s.column}>
          {lines.map((line, lineIdx) => {
            // Each \n we encountered earlier in currentTokens advances the
            // running index too.
            const lineNode = (
              <View key={`line-${lineIdx}`} style={[s.line, { minHeight: lineHeight + (reservePinyinRow ? (pinyinSize + 2) * readingRows : 0) + 8 }]}>
                {line.tokens.map((t) => {
                  const tokenIndex = runningIndex++;
                  if (t.word === '\n') return null;
                  const selected = isSelected(tokenIndex);
                  if (!isReadableWord(t.word, language)) {
                    return (
                      <Text
                        key={tokenIndex}
                        style={[
                          s.plain,
                          {
                            fontSize: hanziSize,
                            lineHeight,
                            color: theme.textMuted,
                            backgroundColor: selected
                              ? theme.accentBg
                              : 'transparent',
                          },
                        ]}
                      >
                        {t.word}
                      </Text>
                    );
                  }
                  const isRevealed =
                    pinyinMode === 'on' || revealed.has(t.word);
                  return (
                    <WordChip
                      key={tokenIndex}
                      token={t}
                      tokenIndex={tokenIndex}
                      hanziSize={hanziSize}
                      pinyinSize={pinyinSize}
                      lineHeight={lineHeight}
                      pinyinMode={pinyinMode}
                      readingMode={readingMode}
                      isRevealed={isRevealed}
                      showToneColors={language === 'zh' && showToneColors}
                      isPlaying={!!playingRange && playingRange[0] <= tokenIndex && tokenIndex <= playingRange[1]}
                      isSelected={selected}
                      maxWidth={Math.max(30, layout.width - PAGE_PADDING * 2 - line.tokens.filter((other) => other !== t).reduce((sum, other) => sum + tokenWidth(other, hanziSize, pinyinSize, reservePinyinRow, readingMode), 0))}
                      theme={theme}
                      onPress={handleTokenPress}
                      onLongPress={handleTokenLongPress}
                    />
                  );
                })}
              </View>
            );
            // Account for the \n token that separated this line from the next.
            return lineNode;
          })}
        </View>
      </View>
      {selection && (
        <View
          style={[
            s.selectionBar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Pressable
            onPress={cancelSelection}
            hitSlop={6}
            style={({ pressed }) => [
              s.selBtn,
              pressed && { backgroundColor: theme.surfaceAlt },
            ]}
          >
            <Text style={[s.selBtnText, { color: theme.textMuted }]}>
              Cancel
            </Text>
          </Pressable>
          <Text
            style={[s.selPreview, { color: theme.text }]}
            numberOfLines={1}
          >
            {selectedText || 'Tap a word to extend'}
          </Text>
          <Pressable
            onPress={submitSelection}
            disabled={!selectedText}
            hitSlop={6}
            style={({ pressed }) => [
              s.selPrimary,
              {
                backgroundColor: selectedText ? theme.accent : theme.border,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={s.selPrimaryText}>Translate</Text>
          </Pressable>
        </View>
      )}

      <View
        style={[
          s.footer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={() => safePage > 0 && onPageChange(safePage - 1)}
          disabled={safePage === 0}
          hitSlop={6}
          style={({ pressed }) => [
            s.navBtn,
            safePage === 0 && s.navBtnDisabled,
            pressed && { backgroundColor: theme.accentBg },
          ]}
          accessibilityLabel="Previous page"
        >
          <Text
            style={[
              s.navText,
              {
                color: safePage === 0 ? theme.textSubtle : theme.accent,
              },
            ]}
          >
            ‹ Prev
          </Text>
        </Pressable>

        <View style={s.footerCenter}>
          <Pressable
            onPress={togglePlay}
            hitSlop={8}
            style={({ pressed }) => [
              s.playBtn,
              {
                backgroundColor: isPlaying
                  ? theme.accent
                  : theme.accentBg,
              },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play page'}
          >
            <Text
              style={[
                s.playIcon,
                {
                  color: isPlaying ? '#ffffff' : theme.accent,
                },
              ]}
            >
              {isPlaying ? '◼' : '▶'}
            </Text>
          </Pressable>
          <Text style={[s.footerText, { color: theme.textSubtle }]}>
            {pageCount > 0 ? `${safePage + 1} / ${pageCount}` : ''}
          </Text>
        </View>

        <Pressable
          onPress={() =>
            safePage < pageCount - 1 && onPageChange(safePage + 1)
          }
          disabled={safePage >= pageCount - 1}
          hitSlop={6}
          style={({ pressed }) => [
            s.navBtn,
            safePage >= pageCount - 1 && s.navBtnDisabled,
            pressed && { backgroundColor: theme.accentBg },
          ]}
          accessibilityLabel="Next page"
        >
          <Text
            style={[
              s.navText,
              {
                color:
                  safePage >= pageCount - 1
                    ? theme.textSubtle
                    : theme.accent,
              },
            ]}
          >
            Next ›
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function WordChip({
  token,
  tokenIndex,
  hanziSize,
  pinyinSize,
  lineHeight,
  pinyinMode,
  readingMode,
  isRevealed,
  showToneColors,
  isPlaying,
  isSelected,
  maxWidth,
  theme,
  onPress,
  onLongPress,
}: {
  token: Token;
  tokenIndex: number;
  hanziSize: number;
  pinyinSize: number;
  lineHeight: number;
  pinyinMode: PinyinMode;
  readingMode?: JapaneseReadingMode;
  isRevealed: boolean;
  showToneColors: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  maxWidth: number;
  theme: Theme;
  onPress: (token: Token, rect: WordRect, tokenIndex: number) => void;
  onLongPress: (tokenIndex: number) => void;
}) {
  const ref = useRef<ComponentRef<typeof View>>(null);

  const handle = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      onPress(token, { x, y, width, height }, tokenIndex);
    });
  };

  const showPinyinRow = pinyinMode !== 'off';
  const estimated = tokenWidth(token, hanziSize, pinyinSize, showPinyinRow, readingMode);
  const scale = Math.min(1, (maxWidth - 6) / Math.max(1, estimated - 6));
  const ruby = token.japanese?.ruby;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={token.word}
      accessibilityState={{ selected: isSelected || isPlaying }}
      aria-selected={isSelected || isPlaying}
      onPress={handle}
      onLongPress={() => onLongPress(tokenIndex)}
      delayLongPress={350}
      style={({ pressed }) => [
        s.token,
        isSelected && { backgroundColor: theme.accentBg },
        isPlaying && { backgroundColor: theme.highlight },
        pressed &&
          !isPlaying &&
          !isSelected && { backgroundColor: theme.highlight },
      ]}
    >
      {readingMode && readingMode !== 'kana' ? (
        <View style={{ alignItems: 'center' }}>
          {showPinyinRow && Array.from({ length: readingMode === 'both' ? 2 : 1 }, (_, i) => {
            const reading = tokenReadingLines(token, readingMode)[i] ?? '';
            return (
              <View key={i} style={{ height: pinyinSize + 2, borderBottomWidth: !isRevealed && reading ? 1 : 0, borderBottomColor: theme.pinyin }}>
                <Text style={{ fontSize: pinyinSize * scale, lineHeight: pinyinSize + 2, color: isRevealed ? theme.pinyin : 'transparent' }}>{reading || ' '}</Text>
              </View>
            );
          })}
          <Text style={{ fontSize: hanziSize * scale, lineHeight, color: theme.hanzi }}>{token.word}</Text>
        </View>
      ) : ruby ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          {ruby.map((part, i) => (
            <View key={i} style={{ alignItems: 'center' }}>
              {showPinyinRow && (
                <View style={{ height: pinyinSize + 2, borderBottomWidth: !isRevealed && part.reading ? 1 : 0, borderBottomColor: theme.pinyin }}>
                  <Text style={{ fontSize: pinyinSize * scale, lineHeight: pinyinSize + 2, color: isRevealed ? theme.pinyin : 'transparent' }}>{part.reading || ' '}</Text>
                </View>
              )}
              <Text style={{ fontSize: hanziSize * scale, lineHeight, color: theme.hanzi }}>{part.text}</Text>
            </View>
          ))}
        </View>
      ) : <>
      {showPinyinRow && (
        <View style={[s.pinyinRow, { minHeight: pinyinSize + 2 }]}>
          {token.syllables.map((syl, i) => {
            const color = showToneColors
              ? theme.tones[syl.tone] ?? theme.pinyin
              : theme.pinyin;
            // Render the pinyin text either visibly (revealed) or with the
            // glyphs invisible but the underline drawn — the layout width
            // matches the actual pinyin so the hanzi never shifts when you
            // reveal a word.
            return (
              <Text
                key={i}
                style={[
                  s.pinyin,
                  {
                    fontSize: pinyinSize * scale,
                    lineHeight: pinyinSize + 2,
                    color: isRevealed ? color : 'transparent',
                    textDecorationLine: isRevealed ? 'none' : 'underline',
                    textDecorationColor: color,
                    textDecorationStyle: 'solid',
                  },
                ]}
              >
                {syl.text}
              </Text>
            );
          })}
        </View>
      )}
      <Text
        style={[
          s.hanzi,
          { fontSize: hanziSize * scale, lineHeight, color: theme.hanzi },
        ]}
      >
        {token.word}
      </Text>
      </>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  page: {
    flex: 1,
    padding: PAGE_PADDING,
    overflow: 'hidden',
  },
  column: { flexDirection: 'column' },
  line: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
    width: '100%',
  },
  token: {
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pinyinRow: { flexDirection: 'row' },
  pinyin: {},
  hanzi: {},
  plain: { alignSelf: 'flex-end', paddingBottom: 4 },
  footer: {
    height: FOOTER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerText: { fontSize: 12, fontWeight: '600' },
  navBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.4 },
  navText: { fontSize: 14, fontWeight: '600' },
  selectionBar: {
    // Float above the footer so showing/hiding the bar doesn't change
    // the page area's height — that used to trigger an `onLayout`,
    // which repaginated the text mid-tap and visibly jumped the screen
    // on Expo Go (web's reflow was atomic so the bug never showed).
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: FOOTER_HEIGHT,
    zIndex: 5,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  selBtnText: { fontSize: 13, fontWeight: '600' },
  selPreview: { flex: 1, fontSize: 14 },
  selPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  selPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 13, fontWeight: '700' },
});
