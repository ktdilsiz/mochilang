import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { FillBlankExercise } from '@mochilang/shared'
import { matchesAnswer } from '@mochilang/shared'
import TappableText from '../TappableText'
import { colors, fontSizes, radius, space } from '../../lib/theme'

interface Props {
  exercise: FillBlankExercise
  value: string
  locked: boolean
  onChange: (v: string) => void
}

export default function FillBlank({ exercise, value, locked, onChange }: Props) {
  const isCorrect = locked && checkAnswer(value, exercise)
  const isWrong = locked && !isCorrect
  // Alternates worth surfacing = anything in acceptableAnswers that
  // isn't the canonical answer (already shown above). The list also
  // hides whatever the learner typed so they're not staring at their
  // own input twice.
  const alts = (exercise.acceptableAnswers ?? [])
    .filter((a) => a.trim().toLowerCase() !== exercise.answer.trim().toLowerCase())
    .filter((a) => a.trim().toLowerCase() !== value.trim().toLowerCase())
  const [altsOpen, setAltsOpen] = useState(false)
  return (
    <View style={styles.root}>
      {exercise.prompt ? (
        <TappableText
          text={exercise.prompt}
          tokens={exercise.promptTokens}
          style={styles.prompt}
        />
      ) : null}
      <TextInput
        style={[
          styles.input,
          isCorrect && styles.inputCorrect,
          isWrong && styles.inputWrong,
        ]}
        value={value}
        editable={!locked}
        onChangeText={onChange}
        placeholder="Type your answer…"
        placeholderTextColor={colors.textSubtle}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />
      {locked && !isCorrect && (
        <Text style={styles.correction}>
          Answer: <Text style={styles.correctionStrong}>{exercise.answer}</Text>
        </Text>
      )}
      {locked && alts.length > 0 && (
        <View style={styles.altsBlock}>
          <Pressable
            onPress={() => setAltsOpen((o) => !o)}
            style={({ pressed }) => [styles.altsToggle, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.altsToggleText}>
              {altsOpen ? '▾' : '▸'} Other accepted answers ({alts.length})
            </Text>
          </Pressable>
          {altsOpen && (
            <View style={styles.altsList}>
              {alts.map((a) => (
                <Text key={a} style={styles.altsItem}>
                  • {a}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

/**
 * Re-exported from @mochilang/shared so existing call sites keep
 * compiling. See packages/shared/src/answers.ts for the rules.
 */
export function checkAnswer(value: string, exercise: FillBlankExercise): boolean {
  return matchesAnswer(value, exercise)
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
  input: {
    width: '100%',
    fontSize: fontSizes.lg,
    fontWeight: '600',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputCorrect: {
    borderColor: colors.success500,
    backgroundColor: colors.success100,
    color: colors.success700,
  },
  inputWrong: {
    borderColor: colors.error500,
    backgroundColor: colors.error100,
    color: colors.error700,
  },
  correction: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  correctionStrong: { color: colors.text, fontWeight: '800' },
  altsBlock: {
    gap: space.xs,
  },
  altsToggle: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.cream100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  altsToggleText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: '700',
  },
  altsList: {
    gap: 2,
    paddingHorizontal: space.lg,
  },
  altsItem: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: '600',
  },
})
