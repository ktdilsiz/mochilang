import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { isChinese, type Token } from '../lib/cn';
import { paginate } from '../lib/paginate';
import { speakAsync, stop as stopSpeech } from '../lib/tts';
import {
  FONT_SIZE_VALUES,
  PINYIN_SIZE_VALUES,
  type FontSize,
  type PinyinMode,
} from '../state';
import { useTheme, type Theme } from '../theme';
import type { WordRect } from './ThoughtBubble';

type Props = {
  tokens: Token[];
  fontSize: FontSize;
  pinyinMode: PinyinMode;
  showToneColors: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onWordPress: (token: Token, rect: WordRect) => void;
};

const PAGE_PADDING = 20;
const FOOTER_HEIGHT = 44;

export function Reader({
  tokens,
  fontSize,
  pinyinMode,
  showToneColors,
  page,
  onPageChange,
  onWordPress,
}: Props) {
  const theme = useTheme();
  const hanziSize = FONT_SIZE_VALUES[fontSize];
  const pinyinSize = PINYIN_SIZE_VALUES[fontSize];
  const lineHeight = Math.round(hanziSize * 1.25);
  const reservePinyinRow = pinyinMode !== 'off';

  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  // Reset per-word reveals when the underlying text changes.
  useEffect(() => {
    setRevealed(new Set());
  }, [tokens]);

  const pages = useMemo(() => {
    if (layout.width <= 0 || layout.height <= 0) return [tokens];
    return paginate({
      tokens,
      hanziSize,
      pinyinSize,
      reservePinyinRow,
      viewWidth: layout.width - PAGE_PADDING * 2,
      viewHeight: layout.height - PAGE_PADDING * 2,
    });
  }, [tokens, hanziSize, pinyinSize, reservePinyinRow, layout.width, layout.height]);

  const pageCount = pages.length;
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const currentTokens = pages[safePage] ?? [];

  // Stop playback on unmount or when the page / tokens change.
  useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;
    let i = 0;
    (async () => {
      while (!cancelled && i < currentTokens.length) {
        const t = currentTokens[i];
        if (!isChinese(t.word)) {
          i++;
          continue;
        }
        setPlayingIndex(i);
        await speakAsync(t.word);
        i++;
      }
      if (!cancelled) {
        setPlayingIndex(null);
        setIsPlaying(false);
      }
    })();
    return () => {
      cancelled = true;
      stopSpeech();
    };
  }, [isPlaying, currentTokens]);

  // Stop & reset when the page changes.
  useEffect(() => {
    setPlayingIndex(null);
    setIsPlaying(false);
    stopSpeech();
  }, [safePage]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== layout.width || height !== layout.height) {
      setLayout({ width, height });
    }
  };

  const togglePlay = () => setIsPlaying((p) => !p);

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <View style={s.page} onLayout={handleLayout}>
        <View style={s.flow}>
          {currentTokens.map((t, i) => {
            if (t.word === '\n') {
              return <View key={i} style={s.lineBreak} />;
            }
            if (!isChinese(t.word)) {
              return (
                <Text
                  key={i}
                  style={[
                    s.plain,
                    {
                      fontSize: hanziSize,
                      lineHeight,
                      color: theme.textMuted,
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
                key={i}
                token={t}
                hanziSize={hanziSize}
                pinyinSize={pinyinSize}
                lineHeight={lineHeight}
                pinyinMode={pinyinMode}
                isRevealed={isRevealed}
                showToneColors={showToneColors}
                isPlaying={playingIndex === i}
                theme={theme}
                onPress={(token, rect) => {
                  if (pinyinMode === 'hint' && !revealed.has(token.word)) {
                    setRevealed((prev) => {
                      const next = new Set(prev);
                      next.add(token.word);
                      return next;
                    });
                  }
                  onWordPress(token, rect);
                }}
              />
            );
          })}
        </View>
      </View>
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
  hanziSize,
  pinyinSize,
  lineHeight,
  pinyinMode,
  isRevealed,
  showToneColors,
  isPlaying,
  theme,
  onPress,
}: {
  token: Token;
  hanziSize: number;
  pinyinSize: number;
  lineHeight: number;
  pinyinMode: PinyinMode;
  isRevealed: boolean;
  showToneColors: boolean;
  isPlaying: boolean;
  theme: Theme;
  onPress: (token: Token, rect: WordRect) => void;
}) {
  const ref = useRef<View>(null);

  const handle = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      onPress(token, { x, y, width, height });
    });
  };

  const showPinyinRow = pinyinMode !== 'off';

  return (
    <Pressable
      ref={ref}
      onPress={handle}
      style={({ pressed }) => [
        s.token,
        isPlaying && { backgroundColor: theme.highlight },
        pressed && !isPlaying && { backgroundColor: theme.highlight },
      ]}
    >
      {showPinyinRow && (
        <View style={s.pinyinRow}>
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
                    fontSize: pinyinSize,
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
          { fontSize: hanziSize, lineHeight, color: theme.hanzi },
        ]}
      >
        {token.word}
      </Text>
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
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  lineBreak: { width: '100%', height: 6 },
  token: {
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pinyinRow: { flexDirection: 'row' },
  pinyin: { marginBottom: 2 },
  hanzi: {},
  plain: { alignSelf: 'flex-end' },
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
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 13, fontWeight: '700' },
});
