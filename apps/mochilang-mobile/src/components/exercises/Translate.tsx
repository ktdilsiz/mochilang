import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { TranslateExercise } from '@mochilang/shared'
import { matchesAnswer } from '@mochilang/shared'
import { speak } from '../../lib/tts'
import { colors, fontSizes, radius, space } from '../../lib/theme'

interface Props {
  exercise: TranslateExercise
  value: string
  locked: boolean
  /** BCP-47 locale of `exercise.source` — used to TTS the source on tap. */
  sourceLocale: string
  /** BCP-47 locale of the expected answer — used to TTS the answer. */
  answerLocale: string
  onChange: (v: string) => void
}

/**
 * Translate exercise — the user reads `exercise.source` (a word or
 * short phrase) and types its translation into the text input. The
 * direction (`to_target` vs `to_source`) is encoded in the type, so
 * the lesson runner can pick the right TTS locale for each side
 * without parsing the prompt heuristically.
 *
 * Mirrors FillBlank's input-card look — same border treatment for
 * correct/wrong, optional acceptable-alternates disclosure, an
 * inline 🔊 button to replay the source word.
 */
export default function Translate({
  exercise,
  value,
  locked,
  sourceLocale,
  answerLocale,
  onChange,
}: Props) {
  const isCorrect = locked && checkTranslateAnswer(value, exercise)
  const isWrong = locked && !isCorrect

  const alts = (exercise.acceptableAnswers ?? [])
    .filter(
      (a) =>
        a.trim().toLowerCase() !== exercise.answer.trim().toLowerCase(),
    )
    .filter((a) => a.trim().toLowerCase() !== value.trim().toLowerCase())
  const [altsOpen, setAltsOpen] = useState(false)

  return (
    <View style={styles.root}>
      <View style={styles.sourceCard}>
        <Pressable
          accessibilityLabel="Speak the source word"
          onPress={() => speak(exercise.source, { language: sourceLocale })}
          style={({ pressed }) => [
            styles.sourcePressable,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.sourceText}>{exercise.source}</Text>
          <Text style={styles.sourceSpeaker}>🔊</Text>
        </Pressable>
        {exercise.context && (
          <Text style={styles.context}>{exercise.context}</Text>
        )}
      </View>

      <TextInput
        style={[
          styles.input,
          isCorrect && styles.inputCorrect,
          isWrong && styles.inputWrong,
        ]}
        value={value}
        editable={!locked}
        onChangeText={onChange}
        placeholder="Type your translation…"
        placeholderTextColor={colors.textSubtle}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />

      {locked && !isCorrect && (
        <Text style={styles.correction}>
          Answer:{' '}
          <Text style={styles.correctionStrong}>{exercise.answer}</Text>
        </Text>
      )}

      {locked && alts.length > 0 && (
        <View style={styles.altsBlock}>
          <Pressable
            onPress={() => setAltsOpen((o) => !o)}
            style={({ pressed }) => [
              styles.altsToggle,
              pressed && { opacity: 0.7 },
            ]}
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
 * Grade a translate exercise with the shared acceptable-answer rules.
 */
export function checkTranslateAnswer(
  value: string,
  exercise: TranslateExercise,
): boolean {
  return matchesAnswer(value, exercise)
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  sourceCard: {
    backgroundColor: colors.cream100,
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: space.sm,
  },
  sourcePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  sourceText: {
    fontSize: fontSizes.xxl,
    fontFamily: 'Nunito_900Black',
    color: colors.text,
    textAlign: 'center',
  },
  sourceSpeaker: {
    fontSize: fontSizes.lg,
    opacity: 0.5,
  },
  context: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
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
  altsBlock: { gap: space.xs },
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
  altsList: { gap: 2, paddingHorizontal: space.lg },
  altsItem: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: '600',
  },
})
