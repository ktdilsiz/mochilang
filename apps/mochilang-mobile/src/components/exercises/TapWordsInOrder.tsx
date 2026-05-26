import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { TapWordsInOrderExercise } from '@mochilang/shared'
import { matchesSequenceAnswer } from '@mochilang/shared'
import TappableText from '../TappableText'
import { localeForOption, speak } from '../../lib/tts'
import { colors, fontSizes, radius, space } from '../../lib/theme'

interface Props {
  exercise: TapWordsInOrderExercise
  locked: boolean
  /** Reports the currently-built sentence so the parent can grade. */
  onChange: (built: string) => void
  resetKey: number
  courseId?: string
}

interface Chip {
  word: string
  key: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TapWordsInOrder({
  exercise,
  locked,
  onChange,
  resetKey,
  courseId,
}: Props) {
  const initialBank = useMemo<Chip[]>(
    () => shuffle(exercise.bank).map((w, i) => ({ word: w, key: `${i}-${w}` })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resetKey, exercise]
  )
  const [bank, setBank] = useState<Chip[]>(initialBank)
  const [built, setBuilt] = useState<Chip[]>([])

  useEffect(() => {
    setBank(initialBank)
    setBuilt([])
  }, [initialBank])

  useEffect(() => {
    // Join with space so Latin-script languages (English, Turkish, …)
    // produce a comparable sentence. CJK answers are normalized to be
    // whitespace-insensitive in matchesSequenceAnswer, so a Chinese
    // build like "你 好" still matches "你好".
    onChange(built.map((b) => b.word).join(' '))
  }, [built, onChange])

  function moveToBuilt(idx: number) {
    if (locked) return
    setBank((prev) => {
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      // Speak the token as it lands in the build area — same intent as
      // the multiple-choice path: hear the target-language word the
      // moment you tap it. Per-token detection so a chip that's
      // English (rare but possible in source-language drills) speaks
      // English instead of being mangled by a Chinese voice.
      speak(item.word, {
        language: localeForOption(
          item.word,
          [exercise.prompt ?? '', exercise.answer, ...exercise.bank],
          courseId,
        ),
      })
      setBuilt((b) => [...b, item])
      return next
    })
  }
  function moveToBank(idx: number) {
    if (locked) return
    setBuilt((prev) => {
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      setBank((b) => [...b, item])
      return next
    })
  }

  // Use the same normalized matcher LessonScreen grades with — strict
  // equality previously disagreed with the parent when the canonical
  // answer had different whitespace/punctuation than the joined-build,
  // so the build area painted red while the lesson said ✓ Correct.
  const builtSentence = built.map((b) => b.word).join(' ')
  const isCorrect =
    locked && matchesSequenceAnswer(builtSentence, exercise.answer)
  const isWrong = locked && !isCorrect

  // For long sentences (≥8 expected tokens) show a "5 / 12" progress
  // counter so the learner has a sense of how much sentence is left.
  const expectedTokenCount = exercise.answer.split(' ').filter(Boolean).length
  const showProgress = expectedTokenCount >= 8

  return (
    <View style={styles.root}>
      {exercise.prompt ? (
        <TappableText text={exercise.prompt} style={styles.prompt} />
      ) : null}
      {showProgress && (
        <Text style={styles.progress}>
          {built.length} / {expectedTokenCount}
        </Text>
      )}
      <View
        style={[
          styles.buildArea,
          showProgress && styles.buildAreaLong,
          isCorrect && styles.buildCorrect,
          isWrong && styles.buildWrong,
        ]}
      >
        {built.length === 0 && (
          <Text style={styles.buildEmpty}>
            Tap words below to build the sentence
          </Text>
        )}
        {built.map((b, i) => (
          <Pressable
            key={b.key}
            disabled={locked}
            onPress={() => moveToBank(i)}
            style={[styles.chip, styles.chipBuilt]}
          >
            <Text style={styles.chipText}>{b.word}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.bank}>
        {bank.map((b, i) => (
          <Pressable
            key={b.key}
            disabled={locked}
            onPress={() => moveToBuilt(i)}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{b.word}</Text>
          </Pressable>
        ))}
      </View>
      {locked && !isCorrect && (
        <Text style={styles.correction}>
          Correct: <Text style={styles.correctionStrong}>{exercise.answer}</Text>
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  prompt: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: fontSizes.xxl * 1.3,
  },
  progress: {
    alignSelf: 'flex-end',
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSubtle,
    marginBottom: -4,
  },
  buildArea: {
    minHeight: 84,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
  },
  buildAreaLong: { minHeight: 132 },
  buildCorrect: {
    borderColor: colors.success500,
    backgroundColor: colors.success100,
  },
  buildWrong: {
    borderColor: colors.error500,
    backgroundColor: colors.error100,
  },
  buildEmpty: {
    color: colors.textSubtle,
    fontStyle: 'italic',
    fontSize: fontSizes.sm,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipBuilt: {
    backgroundColor: colors.primary100,
    borderColor: colors.primary500,
  },
  chipText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  correction: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  correctionStrong: { color: colors.text, fontWeight: '800' },
})
