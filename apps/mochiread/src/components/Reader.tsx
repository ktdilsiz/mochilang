import { useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { isChinese, type Token } from '../lib/cn';
import type { WordRect } from './ThoughtBubble';
import {
  FONT_SIZE_VALUES,
  PINYIN_SIZE_VALUES,
  type FontSize,
} from '../state';

type Props = {
  tokens: Token[];
  fontSize: FontSize;
  showPinyin: boolean;
  onWordPress: (token: Token, rect: WordRect) => void;
};

export function Reader({ tokens, fontSize, showPinyin, onWordPress }: Props) {
  const hanziSize = FONT_SIZE_VALUES[fontSize];
  const pinyinSize = PINYIN_SIZE_VALUES[fontSize];
  const lineHeight = Math.round(hanziSize * 1.25);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={s.flow}>
        {tokens.map((t, i) => {
          if (t.word === '\n') {
            return <View key={i} style={s.lineBreak} />;
          }
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
    </ScrollView>
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
  wrap: { padding: 20, paddingBottom: 80 },
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  lineBreak: { width: '100%', height: 12 },
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
});
