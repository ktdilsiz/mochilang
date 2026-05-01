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
import { useTheme, type Theme } from '../theme';

type Props = {
  onBack: () => void;
};

const SWIPE_THRESHOLD = 110;
const SCREEN_WIDTH = Dimensions.get('window').width;

export function FlashcardsScreen({ onBack }: Props) {
  const { vocab, recordReview } = useStore();
  const theme = useTheme();

  const deck = useMemo(() => buildDeck(vocab), [vocab]);

  if (deck.length === 0) {
    const hasAnyVocab = vocab.length > 0;
    const nextDue = hasAnyVocab
      ? Math.min(...vocab.map((v) => v.dueAt))
      : null;
    return (
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <AppHeader title="Flashcards" leading="back" onLeadingPress={onBack} />
        <View style={s.empty}>
          {hasAnyVocab ? (
            <>
              <Text style={[s.emptyTitle, { color: theme.text }]}>
                All caught up 🎉
              </Text>
              <Text style={[s.emptyHint, { color: theme.textMuted }]}>
                {nextDue
                  ? `Next card due ${formatDueDate(nextDue)}.`
                  : 'No cards waiting.'}
              </Text>
            </>
          ) : (
            <>
              <Text style={[s.emptyTitle, { color: theme.text }]}>
                No words to review
              </Text>
              <Text style={[s.emptyHint, { color: theme.textMuted }]}>
                Tap a word in the reader and hit ★ to add it to your deck.
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Flashcards" leading="back" onLeadingPress={onBack} />
      <DeckRunner
        deck={deck}
        theme={theme}
        onResult={(word, remembered) => recordReview(word, remembered)}
      />
    </View>
  );
}

function DeckRunner({
  deck,
  theme,
  onResult,
}: {
  deck: VocabEntry[];
  theme: Theme;
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
        <View
          style={[
            s.summaryCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[s.summaryEyebrow, { color: theme.accent }]}>
            Session complete
          </Text>
          <Text style={[s.summaryTitle, { color: theme.text }]}>
            {deck.length} cards reviewed
          </Text>
          <View style={s.summaryRow}>
            <Stat
              label="Got it"
              value={stats.remembered}
              tone="good"
              theme={theme}
            />
            <Stat
              label="Forgot"
              value={stats.forgotten}
              tone="bad"
              theme={theme}
            />
          </View>
          <Pressable
            onPress={() => {
              setIndex(0);
              setRevealed(false);
              setStats({ remembered: 0, forgotten: 0 });
            }}
            style={({ pressed }) => [
              s.primaryBtn,
              { backgroundColor: theme.accent },
              pressed && { opacity: 0.85 },
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
      <Text style={[s.progress, { color: theme.textMuted }]}>
        {index + 1} / {deck.length}
      </Text>
      <SwipeCard
        key={card.word + index}
        card={card}
        revealed={revealed}
        theme={theme}
        onTap={() => setRevealed((r) => !r)}
        onSwipe={handleResult}
      />
      <View style={s.actions}>
        <ActionButton
          label="Forgot"
          onPress={() => handleResult(false)}
          tone="bad"
          theme={theme}
        />
        <ActionButton
          label={revealed ? 'Hide' : 'Show'}
          onPress={() => setRevealed((r) => !r)}
          tone="neutral"
          theme={theme}
        />
        <ActionButton
          label="Got it"
          onPress={() => handleResult(true)}
          tone="good"
          theme={theme}
        />
      </View>
    </View>
  );
}

function SwipeCard({
  card,
  revealed,
  theme,
  onTap,
  onSwipe,
}: {
  card: VocabEntry;
  revealed: boolean;
  theme: Theme;
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
          backgroundColor: theme.surface,
          borderColor: theme.border,
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
          style={({ pressed }) => [
            s.speak,
            { backgroundColor: theme.accentBg },
            pressed && { backgroundColor: theme.accentBgPressed },
          ]}
        >
          <Text style={s.speakText}>🔊</Text>
        </Pressable>
        <Text style={[s.hanzi, { color: theme.text }]}>{card.word}</Text>
        {revealed ? (
          <View style={s.back}>
            <Text style={[s.pinyin, { color: theme.textMuted }]}>
              {card.pinyin}
            </Text>
            <View style={s.meanings}>
              {card.meanings.slice(0, 4).map((m, i) => (
                <Text key={i} style={[s.meaning, { color: theme.text }]}>
                  • {m}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <Text style={[s.hint, { color: theme.textSubtle }]}>
            Tap to reveal · swipe to grade
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ActionButton({
  label,
  onPress,
  tone,
  theme,
}: {
  label: string;
  onPress: () => void;
  tone: 'good' | 'bad' | 'neutral';
  theme: Theme;
}) {
  const isDark = theme.isDark;
  const bg =
    tone === 'good'
      ? isDark
        ? '#14532d'
        : '#dcfce7'
      : tone === 'bad'
      ? isDark
        ? '#7f1d1d'
        : '#fee2e2'
      : theme.surfaceAlt;
  const fg =
    tone === 'good'
      ? isDark
        ? '#bbf7d0'
        : '#166534'
      : tone === 'bad'
      ? isDark
        ? '#fecaca'
        : '#991b1b'
      : theme.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        { backgroundColor: bg, borderColor: theme.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[s.actionText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  tone,
  theme,
}: {
  label: string;
  value: number;
  tone: 'good' | 'bad';
  theme: Theme;
}) {
  const color =
    tone === 'good'
      ? theme.isDark
        ? '#4ade80'
        : '#16a34a'
      : theme.isDark
      ? '#f87171'
      : '#dc2626';
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function buildDeck(vocab: VocabEntry[]): VocabEntry[] {
  const now = Date.now();
  // Only cards that are due (or overdue). Sort by how overdue they are so the
  // longest-waiting cards come first.
  const due = vocab
    .filter((v) => v.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
  return shuffleSlight(due);
}

function formatDueDate(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return 'now';
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
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
