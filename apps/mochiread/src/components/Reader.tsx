import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { isChinese, type Token } from '../lib/cn';
import { paginate } from '../lib/paginate';
import {
  FONT_SIZE_VALUES,
  PINYIN_SIZE_VALUES,
  type FontSize,
} from '../state';
import type { WordRect } from './ThoughtBubble';

type Props = {
  tokens: Token[];
  fontSize: FontSize;
  showPinyin: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onWordPress: (token: Token, rect: WordRect) => void;
};

const PAGE_PADDING = 20;
const FOOTER_HEIGHT = 40;

export function Reader({
  tokens,
  fontSize,
  showPinyin,
  page,
  onPageChange,
  onWordPress,
}: Props) {
  const hanziSize = FONT_SIZE_VALUES[fontSize];
  const pinyinSize = PINYIN_SIZE_VALUES[fontSize];
  const lineHeight = Math.round(hanziSize * 1.25);

  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const pages = useMemo(() => {
    if (layout.width <= 0 || layout.height <= 0) return [tokens];
    return paginate({
      tokens,
      hanziSize,
      pinyinSize,
      showPinyin,
      viewWidth: layout.width - PAGE_PADDING * 2,
      viewHeight: layout.height - PAGE_PADDING * 2,
    });
  }, [tokens, hanziSize, pinyinSize, showPinyin, layout.width, layout.height]);

  const pageCount = pages.length;
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const currentTokens = pages[safePage] ?? [];

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== layout.width || height !== layout.height) {
      setLayout({ width, height });
    }
  };

  return (
    <View style={s.root}>
      <View style={s.page} onLayout={handleLayout}>
        <View style={s.flow}>
          {currentTokens.map((t, i) => {
            if (!isChinese(t.word)) {
              return (
                <Text
                  key={i}
                  style={[
                    s.plain,
                    { fontSize: hanziSize, lineHeight },
                  ]}
                >
                  {t.word}
                </Text>
              );
            }
            return (
              <WordChip
                key={i}
                token={t}
                hanziSize={hanziSize}
                pinyinSize={pinyinSize}
                lineHeight={lineHeight}
                showPinyin={showPinyin}
                onPress={onWordPress}
              />
            );
          })}
        </View>
      </View>
      <View style={s.footer}>
        <Pressable
          onPress={() => safePage > 0 && onPageChange(safePage - 1)}
          disabled={safePage === 0}
          hitSlop={6}
          style={({ pressed }) => [
            s.navBtn,
            safePage === 0 && s.navBtnDisabled,
            pressed && s.navBtnPressed,
          ]}
          accessibilityLabel="Previous page"
        >
          <Text style={[s.navText, safePage === 0 && s.navTextDisabled]}>
            ‹ Prev
          </Text>
        </Pressable>
        <Text style={s.footerText}>
          {pageCount > 0 ? `${safePage + 1} / ${pageCount}` : ''}
        </Text>
        <Pressable
          onPress={() =>
            safePage < pageCount - 1 && onPageChange(safePage + 1)
          }
          disabled={safePage >= pageCount - 1}
          hitSlop={6}
          style={({ pressed }) => [
            s.navBtn,
            safePage >= pageCount - 1 && s.navBtnDisabled,
            pressed && s.navBtnPressed,
          ]}
          accessibilityLabel="Next page"
        >
          <Text
            style={[
              s.navText,
              safePage >= pageCount - 1 && s.navTextDisabled,
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
  showPinyin,
  onPress,
}: {
  token: Token;
  hanziSize: number;
  pinyinSize: number;
  lineHeight: number;
  showPinyin: boolean;
  onPress: (token: Token, rect: WordRect) => void;
}) {
  const ref = useRef<View>(null);

  const handle = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      onPress(token, { x, y, width, height });
    });
  };

  return (
    <Pressable
      ref={ref}
      onPress={handle}
      style={({ pressed }) => [s.token, pressed && s.tokenPressed]}
    >
      {showPinyin && (
        <Text style={[s.pinyin, { fontSize: pinyinSize }]}>{token.pinyin}</Text>
      )}
      <Text style={[s.hanzi, { fontSize: hanziSize, lineHeight }]}>
        {token.word}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  page: {
    flex: 1,
    padding: PAGE_PADDING,
    overflow: 'hidden',
  },
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  token: {
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tokenPressed: { backgroundColor: '#fef3c7' },
  pinyin: { color: '#9ca3af', marginBottom: 2 },
  hanzi: { color: '#111827' },
  plain: { color: '#6b7280', alignSelf: 'flex-end' },
  footer: {
    height: FOOTER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  footerText: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  navBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  navBtnPressed: { backgroundColor: '#eff6ff' },
  navBtnDisabled: { opacity: 0.4 },
  navText: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
  navTextDisabled: { color: '#9ca3af' },
});
