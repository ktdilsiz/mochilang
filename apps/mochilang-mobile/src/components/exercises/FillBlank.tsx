import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { FillBlankExercise } from '@mochilang/shared'
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
  return (
    <View style={styles.root}>
      <Text style={styles.prompt}>{exercise.prompt}</Text>
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
    </View>
  )
}

export function checkAnswer(value: string, exercise: FillBlankExercise): boolean {
  const normalized = value.trim().toLowerCase()
  if (normalized === exercise.answer.trim().toLowerCase()) return true
  return (exercise.acceptableAnswers ?? []).some(
    (a) => normalized === a.trim().toLowerCase()
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
})
