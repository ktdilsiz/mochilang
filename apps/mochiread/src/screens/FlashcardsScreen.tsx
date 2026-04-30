import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useStore, type VocabEntry } from '../state';
import { speak } from '../lib/tts';

type Props = {
  onBack: () => void;
};

const SWIPE_THRESHOLD = 110;
const SCREEN_WIDTH = Dimensions.get('window').width;

export function FlashcardsScreen({ onBack }: Props) {
  const { vocab, recordReview } = useStore();

  const deck = useMemo(() => buildDeck(vocab), [vocab]);

  if (deck.length === 0) {
    return (
      <View style={s.root}>
        <AppHeader title="Flashcards" leading="back" onLeadingPress={onBack} />
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No words to review</Text>
          <Text style={s.emptyHint}>
            Tap a word in the reader and hit ★ to add it to your deck.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <AppHeader title="Flashcards" leading="back" onLeadingPress={onBack} />
      <DeckRunner
        deck={deck}
        onResult={(word, remembered) => recordReview(word, remembered)}
      />
    </View>
  );
}

function DeckRunner({
  deck,
  onResult,
}: {
  deck: VocabEntry[];
  onResult: (word: string, remembered: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ remembered: 0, forgotten: 0 });

  const card = deck[index];
  const finished = index >= deck.length;

  if (finished) {
    return (
      <View style={s.summaryWrap}>
        <View style={s.summaryCard}>
          <Text style={s.summaryEyebrow}>Session complete</Text>
          <Text style={s.summaryTitle}>{deck.length} cards reviewed</Text>
          <View style={s.summaryRow}>
            <Stat label="Got it" value={stats.remembered} tone="good" />
            <Stat label="Forgot" value={stats.forgotten} tone="bad" />
          </View>
          <Pressable
            onPress={() => {
              setIndex(0);
              setRevealed(false);
              setStats({ remembered: 0, forgotten: 0 });
            }}
            style={({ pressed }) => [
              s.primaryBtn,
              pressed && s.primaryBtnPressed,
            ]}
          >
            <Text style={s.primaryBtnText}>Start again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleResult = (remembered: boolean) => {
    onResult(card.word, remembered);
    setStats((s) => ({
      remembered: s.remembered + (remembered ? 1 : 0),
      forgotten: s.forgotten + (remembered ? 0 : 1),
    }));
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  return (
    <View style={s.deckWrap}>
      <Text style={s.progress}>
        {index + 1} / {deck.length}
      </Text>
      <SwipeCard
        key={card.word + index}
        card={card}
        revealed={revealed}
        onTap={() => setRevealed((r) => !r)}
        onSwipe={handleResult}
      />
      <View style={s.actions}>
        <ActionButton
          label="Forgot"
          onPress={() => handleResult(false)}
          tone="bad"
        />
        <ActionButton
          label={revealed ? 'Hide' : 'Show'}
          onPress={() => setRevealed((r) => !r)}
          tone="neutral"
        />
        <ActionButton
          label="Got it"
          onPress={() => handleResult(true)}
          tone="good"
        />
      </View>
    </View>
  );
}

function SwipeCard({
  card,
  revealed,
  onTap,
  onSwipe,
}: {
  card: VocabEntry;
  revealed: boolean;
  onTap: () => void;
  onSwipe: (remembered: boolean) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const exiting = useRef(false);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          pan.setOffset({
            x: (pan.x as any)._value ?? 0,
            y: (pan.y as any)._value ?? 0,
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, g) => {
          pan.flattenOffset();
          if (exiting.current) return;
          if (g.dx > SWIPE_THRESHOLD) flyOut(true);
          else if (g.dx < -SWIPE_THRESHOLD) flyOut(false);
          else
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 6,
              useNativeDriver: false,
            }).start();
        },
      }),
    [pan]
  );

  const flyOut = (remembered: boolean) => {
    exiting.current = true;
    Animated.timing(pan, {
      toValue: { x: remembered ? SCREEN_WIDTH * 1.4 : -SCREEN_WIDTH * 1.4, y: 0 },
      duration: 240,
      useNativeDriver: false,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      exiting.current = false;
      onSwipe(remembered);
    });
  };

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-12deg', '0deg', '12deg'],
  });
  const goodOpacity = pan.x.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const badOpacity = pan.x.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        s.card,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
        },
      ]}
      {...responder.panHandlers}
    >
      <Animated.View
        style={[s.stamp, s.stampGood, { opacity: goodOpacity }]}
        pointerEvents="none"
      >
        <Text style={s.stampGoodText}>GOT IT</Text>
      </Animated.View>
      <Animated.View
        style={[s.stamp, s.stampBad, { opacity: badOpacity }]}
        pointerEvents="none"
      >
        <Text style={s.stampBadText}>FORGOT</Text>
      </Animated.View>

      <Pressable style={s.cardInner} onPress={onTap}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            speak(card.word);
          }}
          hitSlop={8}
          style={({ pressed }) => [s.speak, pressed && s.speakPressed]}
        >
          <Text style={s.speakText}>🔊</Text>
        </Pressable>
        <Text style={s.hanzi}>{card.word}</Text>
        {revealed ? (
          <View style={s.back}>
            <Text style={s.pinyin}>{card.pinyin}</Text>
            <View style={s.meanings}>
              {card.meanings.slice(0, 4).map((m, i) => (
                <Text key={i} style={s.meaning}>
                  • {m}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <Text style={s.hint}>Tap to reveal · swipe to grade</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ActionButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: 'good' | 'bad' | 'neutral';
}) {
  const toneStyle =
    tone === 'good' ? s.actionGood : tone === 'bad' ? s.actionBad : s.actionNeutral;
  const toneText =
    tone === 'good'
      ? s.actionGoodText
      : tone === 'bad'
      ? s.actionBadText
      : s.actionNeutralText;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        toneStyle,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[s.actionText, toneText]}>{label}</Text>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'good' | 'bad';
}) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, tone === 'good' ? s.good : s.bad]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function buildDeck(vocab: VocabEntry[]): VocabEntry[] {
  const ranked = vocab
    .map((v) => ({
      v,
      score:
        (v.forgotten - v.remembered) * 5 -
        (v.lastReviewedAt ? (Date.now() - v.lastReviewedAt) / 60000 : 0) * -1,
    }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.v);
  return shuffleSlight(ranked);
}

function shuffleSlight<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = 0; i < out.length - 1; i++) {
    if (Math.random() < 0.3) {
      [out[i], out[i + 1]] = [out[i + 1], out[i]];
    }
  }
  return out;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, color: '#374151', fontWeight: '600' },
  emptyHint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },
  deckWrap: { flex: 1, padding: 16, alignItems: 'center', gap: 16 },
  progress: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  card: {
    width: '100%',
    maxWidth: 420,
    flex: 1,
    minHeight: 320,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardInner: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  speak: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  speakPressed: { backgroundColor: '#dbeafe' },
  speakText: { fontSize: 18 },
  hanzi: {
    fontSize: 64,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  back: { alignItems: 'center', gap: 8 },
  pinyin: { fontSize: 18, color: '#374151' },
  meanings: { gap: 4, alignItems: 'center', marginTop: 4 },
  meaning: { fontSize: 15, color: '#374151', textAlign: 'center' },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 8 },
  stamp: {
    position: 'absolute',
    top: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 3,
  },
  stampGood: {
    right: 22,
    borderColor: '#16a34a',
    transform: [{ rotate: '12deg' }],
  },
  stampGoodText: { color: '#16a34a', fontSize: 18, fontWeight: '900' },
  stampBad: {
    left: 22,
    borderColor: '#dc2626',
    transform: [{ rotate: '-12deg' }],
  },
  stampBadText: { color: '#dc2626', fontSize: 18, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  action: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionGood: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  actionBad: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  actionNeutral: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  actionText: { fontSize: 14, fontWeight: '700' },
  actionGoodText: { color: '#166534' },
  actionBadText: { color: '#991b1b' },
  actionNeutralText: { color: '#374151' },
  summaryWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    gap: 12,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  summaryRow: { flexDirection: 'row', gap: 24, marginVertical: 8 },
  statBox: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase' },
  good: { color: '#16a34a' },
  bad: { color: '#dc2626' },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 4,
  },
  primaryBtnPressed: { opacity: 0.85 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
});
