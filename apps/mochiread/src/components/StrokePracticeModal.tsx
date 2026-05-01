import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  HanziWriter,
  useHanziWriter,
} from '@jamsch/react-native-hanzi-writer';
import { isCJK } from '../lib/segment';
import { useTheme } from '../theme';

type Props = {
  /** A character or word; multi-character words are practiced one char at a time. */
  word: string | null;
  onClose: () => void;
};

const DATA_URL = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

export function StrokePracticeModal({ word, onClose }: Props) {
  const fade = useRef(new Animated.Value(0)).current;

  const chars = useMemo(
    () => (word ? [...word].filter((c) => isCJK(c)) : []),
    [word]
  );

  useEffect(() => {
    if (!word) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [word]);

  if (!word || chars.length === 0) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.overlay, { opacity: fade }]}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.center} pointerEvents="box-none">
        <PracticeDeck chars={chars} onClose={onClose} />
      </View>
    </Animated.View>
  );
}

function PracticeDeck({
  chars,
  onClose,
}: {
  chars: string[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(Math.max(0, index), chars.length - 1);
  const char = chars[safeIndex];
  return (
    <Practice
      key={char}
      char={char}
      indexInfo={
        chars.length > 1
          ? { current: safeIndex, total: chars.length }
          : undefined
      }
      onPrev={safeIndex > 0 ? () => setIndex(safeIndex - 1) : undefined}
      onNext={
        safeIndex < chars.length - 1
          ? () => setIndex(safeIndex + 1)
          : undefined
      }
      onClose={onClose}
    />
  );
}

function Practice({
  char,
  indexInfo,
  onPrev,
  onNext,
  onClose,
}: {
  char: string;
  indexInfo?: { current: number; total: number };
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [completion, setCompletion] = useState<{
    mistakes: number;
  } | null>(null);

  const writer = useHanziWriter({
    character: char,
    loader: (c) =>
      fetch(`${DATA_URL}/${encodeURIComponent(c)}.json`).then((res) => {
        if (!res.ok) throw new Error('Stroke data unavailable');
        return res.json();
      }),
  });

  const quizActive = writer.quiz.useStore((q) => q.active);
  const currentStroke = writer.quiz.useStore((q) => q.index);
  const mistakeMap = writer.quiz.useStore((q) => q.mistakes);
  const totalMistakes = Object.values(mistakeMap).reduce((a, b) => a + b, 0);
  const mistakes = mistakeMap[currentStroke] ?? 0;
  const animatorState = writer.animator.useStore((a) => a.state);
  const totalStrokes = writer.characterClass?.strokes.length ?? 0;

  const startQuiz = () => {
    setCompletion(null);
    writer.quiz.start({
      leniency: 1,
      showHintAfterMisses: 2,
      onComplete: ({ totalMistakes }) => {
        setCompletion({ mistakes: totalMistakes });
      },
    });
  };

  const playAnimation = () => {
    writer.animator.animateCharacter({
      strokeDuration: 700,
      delayBetweenStrokes: 400,
    });
  };

  const stopAnimation = () => writer.animator.cancelAnimation();

  return (
    <Pressable
      style={[s.sheet, { backgroundColor: theme.surface }]}
      onPress={() => {}}
    >
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <Text style={[s.title, { color: theme.text }]}>
          Stroke order
          {indexInfo
            ? ` · ${indexInfo.current + 1} / ${indexInfo.total}`
            : ''}
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={({ pressed }) => [
            s.closeBtn,
            pressed && { backgroundColor: theme.surfaceAlt },
          ]}
          accessibilityLabel="Close"
        >
          <Text style={[s.closeIcon, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      <View style={s.charRow}>
        {onPrev ? (
          <Pressable
            onPress={onPrev}
            hitSlop={10}
            style={({ pressed }) => [
              s.charNav,
              pressed && { backgroundColor: theme.surfaceAlt },
            ]}
          >
            <Text style={[s.charNavText, { color: theme.accent }]}>‹</Text>
          </Pressable>
        ) : (
          <View style={s.charNav} />
        )}
        <Text style={[s.charLabel, { color: theme.text }]}>{char}</Text>
        {onNext ? (
          <Pressable
            onPress={onNext}
            hitSlop={10}
            style={({ pressed }) => [
              s.charNav,
              pressed && { backgroundColor: theme.surfaceAlt },
            ]}
          >
            <Text style={[s.charNavText, { color: theme.accent }]}>›</Text>
          </Pressable>
        ) : (
          <View style={s.charNav} />
        )}
      </View>

      <View style={s.canvasWrap}>
        <HanziWriter
          writer={writer}
          loading={
            <View style={s.loading}>
              <Text style={{ color: theme.textMuted }}>
                Loading strokes…
              </Text>
            </View>
          }
          error={
            <View style={s.loading}>
              <Text style={{ color: theme.textMuted }}>
                No stroke data for this character.
              </Text>
              <Pressable onPress={writer.refetch} hitSlop={8}>
                <Text
                  style={{ color: theme.accent, marginTop: 8, fontWeight: '600' }}
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          }
          style={s.canvas}
        >
          <HanziWriter.GridLines color={theme.border} />
          <HanziWriter.Svg>
            <HanziWriter.Outline color={theme.border} />
            <HanziWriter.Character color={theme.text} radicalColor={theme.accent} />
            <HanziWriter.QuizStrokes />
            <HanziWriter.QuizMistakeHighlighter
              color={theme.accent}
              strokeDuration={400}
            />
          </HanziWriter.Svg>
        </HanziWriter>
      </View>

      <View style={s.statusRow}>
        {quizActive ? (
          <Text style={[s.status, { color: theme.textMuted }]}>
            Stroke {currentStroke + 1}
            {totalStrokes ? ` / ${totalStrokes}` : ''} · {totalMistakes} mistake
            {totalMistakes === 1 ? '' : 's'}
            {mistakes >= 2 ? ' · hint shown' : ''}
          </Text>
        ) : completion ? (
          <Text style={[s.status, { color: theme.text, fontWeight: '600' }]}>
            ✓ Done · {completion.mistakes} mistake
            {completion.mistakes === 1 ? '' : 's'}
          </Text>
        ) : (
          <Text style={[s.status, { color: theme.textMuted }]}>
            {totalStrokes
              ? `${totalStrokes} stroke${totalStrokes === 1 ? '' : 's'}`
              : ''}
          </Text>
        )}
      </View>

      <View style={s.actions}>
        <Action
          label={animatorState === 'playing' ? 'Stop' : 'Watch'}
          onPress={animatorState === 'playing' ? stopAnimation : playAnimation}
          tone="neutral"
          theme={theme}
        />
        <Action
          label={quizActive ? 'Stop quiz' : 'Practice'}
          onPress={quizActive ? writer.quiz.stop : startQuiz}
          tone="primary"
          theme={theme}
        />
      </View>
    </Pressable>
  );
}

function Action({
  label,
  onPress,
  tone,
  theme,
}: {
  label: string;
  onPress: () => void;
  tone: 'primary' | 'neutral';
  theme: ReturnType<typeof useTheme>;
}) {
  const isPrimary = tone === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        {
          backgroundColor: isPrimary ? theme.accent : theme.surfaceAlt,
          borderColor: theme.border,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[
          s.actionText,
          { color: isPrimary ? '#ffffff' : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 100,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 2,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 16 },
  charRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 24,
  },
  charLabel: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    minWidth: 48,
  },
  charNav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charNavText: { fontSize: 28, fontWeight: '300', marginTop: -4 },
  canvasWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  canvas: { alignSelf: 'center' },
  loading: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { paddingHorizontal: 16, alignItems: 'center', minHeight: 18 },
  status: { fontSize: 13 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  action: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontSize: 15, fontWeight: '600' },
});
