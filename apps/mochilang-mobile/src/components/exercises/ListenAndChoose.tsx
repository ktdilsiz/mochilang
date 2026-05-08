import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { ListenAndChooseExercise } from '@mochilang/shared'
import { speak } from '../../lib/tts'
import { useSettings } from '../../state/useSettings'
import { colors, fontSizes, radius, space } from '../../lib/theme'

interface Props {
  exercise: ListenAndChooseExercise
  selected: string | null
  locked: boolean
  onSelect: (value: string) => void
}

export default function ListenAndChoose({
  exercise,
  selected,
  locked,
  onSelect,
}: Props) {
  const { state: settings } = useSettings()

  // Auto-play once on mount, when the user has opted in.
  useEffect(() => {
    if (settings.autoPlayAudio) speak(exercise.spokenText)
  }, [exercise.spokenText, settings.autoPlayAudio])

  return (
    <View style={styles.root}>
      <Text style={styles.prompt}>{exercise.prompt}</Text>
      <View style={styles.listenWrap}>
        <Pressable
          style={styles.listenBtn}
          onPress={() => speak(exercise.spokenText)}
          accessibilityLabel="Play audio"
        >
          <Text style={styles.listenText}>🔊 Play again</Text>
        </Pressable>
      </View>
      <View style={styles.options}>
        {exercise.options.map((opt) => {
          const isSelected = selected === opt
          const isCorrect = locked && opt === exercise.answer
          const isWrong = locked && isSelected && opt !== exercise.answer
          return (
            <Pressable
              key={opt}
              disabled={locked}
              style={[
                styles.option,
                isSelected && !locked && styles.optionSelected,
                isCorrect && styles.optionCorrect,
                isWrong && styles.optionWrong,
              ]}
              onPress={() => {
                // Speak the tapped option so the learner can compare it
                // to the prompt audio. Drills tone-pair distinctions
                // (买/卖, 行 háng/行 xíng) without per-option audio assets.
                speak(opt)
                onSelect(opt)
              }}
            >
              <Text
                style={[
                  styles.optionHanzi,
                  isCorrect && styles.optionTextCorrect,
                  isWrong && styles.optionTextWrong,
                ]}
              >
                {opt}
              </Text>
              <Text style={styles.optionListen}>🔊</Text>
            </Pressable>
          )
        })}
      </View>
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
  listenWrap: { alignItems: 'center' },
  listenBtn: {
    backgroundColor: colors.primary500,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary700,
  },
  listenText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: fontSizes.md,
  },
  options: { gap: space.md },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 18,
    paddingHorizontal: 16,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  optionSelected: {
    borderColor: colors.primary500,
    backgroundColor: colors.primary100,
  },
  optionCorrect: {
    borderColor: colors.success500,
    backgroundColor: colors.success100,
  },
  optionWrong: {
    borderColor: colors.error500,
    backgroundColor: colors.error100,
  },
  optionHanzi: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  optionTextCorrect: { color: colors.success700 },
  optionTextWrong: { color: colors.error700 },
  optionListen: {
    fontSize: fontSizes.sm,
    opacity: 0.5,
  },
})
