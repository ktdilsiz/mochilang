import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { lookup } from '../lib/dict';
import { hasExploreData } from '../lib/decomp';
import { speak, stop } from '../lib/tts';
import { useStore } from '../state';
import { useTheme } from '../theme';

export type WordRect = { x: number; y: number; width: number; height: number };

type Props = {
  word: string | null;
  pinyin: string;
  rect: WordRect | null;
  onClose: () => void;
  onExplore: (word: string) => void;
};

const PANEL_WIDTH = 280;
const ARROW_HEIGHT = 10;
const GAP = 8;
const EDGE_PADDING = 8;

export function ThoughtBubble({ word, pinyin, rect, onClose, onExplore }: Props) {
  const visible = word !== null && rect !== null;
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-6)).current;
  const { saveWord, removeWord, isWordSaved, prefs } = useStore();
  const theme = useTheme();

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.84);
    opacity.setValue(0);
    translateY.setValue(-8);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 130,
        useNativeDriver: true,
      }),
    ]).start();
    if (word && prefs.autoPlay) speak(word);
    return () => stop();
  }, [visible, word, prefs.autoPlay]);

  if (!visible) return null;

  const screenWidth = Dimensions.get('window').width;
  const wordCenterX = rect.x + rect.width / 2;

  const left = Math.max(
    EDGE_PADDING,
    Math.min(
      wordCenterX - PANEL_WIDTH / 2,
      screenWidth - PANEL_WIDTH - EDGE_PADDING
    )
  );
  const arrowLeft = wordCenterX - left - 8;
  const top = rect.y + rect.height + GAP + ARROW_HEIGHT;

  const entry = lookup(word);
  const saved = isWordSaved(word);

  const toggleSave = () => {
    if (saved) {
      removeWord(word);
    } else {
      saveWord({
        word,
        pinyin,
        meanings: entry?.meanings ?? [],
      });
    }
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            s.panel,
            {
              top,
              left,
              width: PANEL_WIDTH,
              opacity,
              transform: [{ translateY }, { scale }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              s.arrow,
              { left: arrowLeft, borderBottomColor: theme.surface },
            ]}
          />
          <View
            style={[
              s.panelInner,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={s.headerRow}>
              <View style={s.headerText}>
                <Text style={[s.pinyin, { color: theme.textMuted }]}>
                  {pinyin}
                </Text>
                <Text style={[s.word, { color: theme.text }]}>{word}</Text>
              </View>
              <View style={s.headerButtons}>
                <Pressable
                  onPress={toggleSave}
                  hitSlop={10}
                  style={({ pressed }) => [
                    s.iconBtn,
                    {
                      backgroundColor: saved
                        ? theme.savedBg
                        : theme.surfaceAlt,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                  accessibilityLabel={saved ? 'Unsave word' : 'Save word'}
                >
                  <Text
                    style={[
                      s.iconText,
                      { color: saved ? theme.saved : theme.text },
                    ]}
                  >
                    {saved ? '★' : '☆'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => speak(word)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    s.iconBtn,
                    { backgroundColor: theme.accentBg },
                    pressed && { opacity: 0.75 },
                  ]}
                  accessibilityLabel="Play pronunciation"
                >
                  <Text style={s.iconText}>🔊</Text>
                </Pressable>
              </View>
            </View>
            {entry ? (
              <View style={s.meanings}>
                {entry.meanings.slice(0, 6).map((m, i) => (
                  <Text
                    key={i}
                    style={[s.meaning, { color: theme.text }]}
                  >
                    • {m}
                  </Text>
                ))}
                {entry.meanings.length > 6 && (
                  <Text style={[s.more, { color: theme.textSubtle }]}>
                    +{entry.meanings.length - 6} more
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[s.notFound, { color: theme.textSubtle }]}>
                No definition found.
              </Text>
            )}
            {hasExploreData(word) && (
              <Pressable
                onPress={() => onExplore(word)}
                style={({ pressed }) => [
                  s.exploreBtn,
                  { backgroundColor: theme.accentBg },
                  pressed && { backgroundColor: theme.accentBgPressed },
                ]}
              >
                <Text style={[s.exploreText, { color: theme.accent }]}>
                  Explore characters →
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  panel: {
    position: 'absolute',
  },
  arrow: {
    position: 'absolute',
    top: -ARROW_HEIGHT,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: ARROW_HEIGHT,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
  },
  panelInner: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(229,231,235,0.9)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerText: { flex: 1 },
  headerButtons: { flexDirection: 'row', gap: 6 },
  pinyin: { fontSize: 14, color: '#6b7280' },
  word: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    letterSpacing: -0.4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  iconBtnSaved: { backgroundColor: '#fef3c7' },
  speakBtn: { backgroundColor: '#eff6ff' },
  iconBtnPressed: { opacity: 0.75 },
  iconText: { fontSize: 16, color: '#374151' },
  iconTextSaved: { color: '#b45309' },
  meanings: { marginTop: 10, gap: 4 },
  meaning: { fontSize: 15, color: '#374151', lineHeight: 21 },
  more: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  notFound: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 10,
    fontStyle: 'italic',
  },
  exploreBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  exploreBtnPressed: { backgroundColor: '#dbeafe' },
  exploreText: { fontSize: 13, color: '#1d4ed8', fontWeight: '600' },
});
