import { useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Speech from 'expo-speech'
import type { Exercise, Lesson } from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  lesson: Lesson
  onComplete: (mistakes: number) => void
  onBack: () => void
}

/**
 * Phase 1 LessonScreen — supports `multiple_choice` end-to-end and shows
 * a "this exercise type isn't ported yet" placeholder for the other four.
 * Phase 2 ports fill_blank, match_pairs, listen_and_choose, and
 * tap_words_in_order.
 */
export default function LessonScreen({ lesson, onComplete, onBack }: Props) {
  const [index, setIndex] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle')

  const ex = lesson.exercises[index]
  const isLast = index === lesson.exercises.length - 1
  const total = lesson.exercises.length

  function check() {
    if (ex.type !== 'multiple_choice') {
      // Auto-advance unsupported types — they're stubs in Phase 1.
      next()
      return
    }
    if (selected === ex.answer) {
      setFeedback('correct')
    } else {
      setFeedback('wrong')
      setMistakes((m) => m + 1)
    }
  }

  function next() {
    if (isLast) {
      onComplete(mistakes)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setFeedback('idle')
  }

  return (
    <View style={styles.shell}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={styles.x}>
          <Text style={styles.xText}>×</Text>
        </Pressable>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / total) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {index + 1}/{total}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <ExerciseView
          ex={ex}
          locked={feedback !== 'idle'}
          selected={selected}
          onSelect={(v) => setSelected(v)}
        />
      </ScrollView>

      <View style={styles.footer}>
        {feedback === 'correct' && (
          <Text style={[styles.feedback, { color: colors.success700 }]}>
            ✓ Correct!
          </Text>
        )}
        {feedback === 'wrong' && ex.type === 'multiple_choice' && (
          <Text style={[styles.feedback, { color: colors.error700 }]}>
            Correct: {ex.answer}
          </Text>
        )}
        <LedgeButton
          label={feedback === 'idle' ? 'Check' : isLast ? 'Finish' : 'Continue'}
          tone={feedback === 'wrong' ? 'error' : 'primary'}
          size="lg"
          disabled={
            feedback === 'idle' && ex.type === 'multiple_choice' && !selected
          }
          onPress={feedback === 'idle' ? check : next}
        />
      </View>
    </View>
  )
}

interface ExerciseViewProps {
  ex: Exercise
  locked: boolean
  selected: string | null
  onSelect: (value: string) => void
}

function ExerciseView({ ex, locked, selected, onSelect }: ExerciseViewProps) {
  if (ex.type === 'multiple_choice') {
    return (
      <View style={styles.exRoot}>
        <Text style={styles.prompt}>{ex.prompt}</Text>
        <View style={styles.options}>
          {ex.options.map((opt) => {
            const isSel = selected === opt
            const isCorrect = locked && opt === ex.answer
            const isWrong = locked && isSel && opt !== ex.answer
            return (
              <Pressable
                key={opt}
                onPress={() => !locked && onSelect(opt)}
                style={[
                  styles.option,
                  isSel && styles.optionSelected,
                  isCorrect && styles.optionCorrect,
                  isWrong && styles.optionWrong,
                ]}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  // Stubs for the other 4 exercise types — Phase 2 work.
  return (
    <View style={styles.exRoot}>
      <Text style={styles.prompt}>{('prompt' in ex && ex.prompt) || ex.id}</Text>
      <View style={styles.stubBox}>
        <Text style={styles.stubTitle}>{ex.type} (Phase 2)</Text>
        <Text style={styles.stubBody}>
          This exercise type isn't ported yet — tap Continue to skip.
        </Text>
        {ex.type === 'listen_and_choose' && (
          <Pressable
            style={styles.stubPlay}
            onPress={() =>
              Speech.speak(ex.spokenText, { language: 'zh-CN' })
            }
          >
            <Text style={styles.stubPlayText}>🔊 Hear it anyway</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    paddingTop: space.xl + space.lg,
  },
  x: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xText: { fontSize: 24, fontWeight: '900', color: colors.textMuted },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.success500 },
  progressText: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '700' },
  body: { padding: space.lg, gap: space.lg, flexGrow: 1 },
  exRoot: { gap: space.lg },
  prompt: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.text },
  options: { gap: space.sm },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: 'center',
  },
  optionSelected: { borderColor: colors.primary500, backgroundColor: colors.primary100 },
  optionCorrect: { borderColor: colors.success500, backgroundColor: colors.success100 },
  optionWrong: { borderColor: colors.error500, backgroundColor: colors.error100 },
  optionText: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  footer: {
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.sm,
  },
  feedback: { fontSize: fontSizes.md, fontWeight: '800' },
  stubBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  stubTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.textMuted },
  stubBody: { fontSize: fontSizes.sm, color: colors.textMuted },
  stubPlay: {
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: space.sm,
  },
  stubPlayText: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
})
