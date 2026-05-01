import { useEffect, useRef, useState } from 'react';
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
import { useTheme } from '../theme';

type Props = {
  char: string | null;
  onClose: () => void;
};

const DATA_URL = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

export function StrokePracticeModal({ char, onClose }: Props) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!char) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [char]);

  if (!char) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.overlay, { opacity: fade }]}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.center} pointerEvents="box-none">
        <Practice char={char} onClose={onClose} />
      </View>
    </Animated.View>
  );
}

function Practice({ char, onClose }: { char: string; onClose: () => void }) {
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
        <Text style={[s.title, { color: theme.text }]}>Stroke order</Text>
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

      <Text style={[s.charLabel, { color: theme.text }]}>{char}</Text>

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
  charLabel: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: -0.5,
  },
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
