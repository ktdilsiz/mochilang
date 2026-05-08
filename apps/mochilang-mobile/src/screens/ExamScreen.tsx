import { useMemo, useState, type ReactNode } from 'react'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Exercise } from '@mochilang/shared'
import { matchesSequenceAnswer } from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import FillBlank, {
  checkAnswer as checkFillBlank,
} from '../components/exercises/FillBlank'
import MatchPairs from '../components/exercises/MatchPairs'
import ListenAndChoose from '../components/exercises/ListenAndChoose'
import TapWordsInOrder from '../components/exercises/TapWordsInOrder'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  /** Eyebrow line above the exercise area, e.g. "Topic exam — Greetings". */
  eyebrow: string
  /** Re-rolls each call (initial mount + retries) to randomize questions. */
  getQuestions: () => Exercise[]
  /** Pass threshold expressed as a fraction in [0, 1]. */
  passThreshold: number
  /** Result-page copy when the user passes. */
  pass: { title: string; body: ReactNode; cta?: string }
  /** Result-page copy when the user fails. */
  fail: { title: string; body: ReactNode }
  /** Called once when the user passes and confirms. */
  onPass: () => void
  /** Quit / back navigation. */
  onBack: () => void
  /** Optional — fires per wrong answer for mistake tracking. */
  onWrongAnswer?: (exerciseId: string) => void
  /** Optional — fires per correct answer (used by Practice Mistakes). */
  onCorrectAnswer?: (exerciseId: string) => void
}

type Feedback = 'idle' | 'correct' | 'wrong'

/**
 * Mobile mirror of the web ExamScreen — generic exam runner shared by
 * both the topic-skip and level-skip flows. The wrappers
 * (TopicExamScreen / LevelExamScreen) supply the right question
 * picker, threshold, and copy.
 */
export default function ExamScreen({
  eyebrow,
  getQuestions,
  passThreshold,
  pass,
  fail,
  onPass,
  onBack,
  onWrongAnswer,
  onCorrectAnswer,
}: Props) {
  const insets = useSafeAreaInsets()
  const [seed, setSeed] = useState(0)
  const questions = useMemo<Exercise[]>(
    () => getQuestions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed]
  )

  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [resetKey, setResetKey] = useState(0)
  const [mcSelected, setMcSelected] = useState<string | null>(null)
  const [fbValue, setFbValue] = useState('')
  const [tapValue, setTapValue] = useState('')
  const [done, setDone] = useState(false)

  const total = questions.length
  const ex = questions[index]
  const isLast = index >= total - 1
  const locked = feedback !== 'idle'
  const passed = total > 0 && correct / total >= passThreshold

  function check() {
    if (locked) return
    const result = grade(ex, { mcSelected, fbValue, tapValue })
    if (!result) return
    if (result.correct) {
      setCorrect((c) => c + 1)
      setFeedback('correct')
      onCorrectAnswer?.(ex.id)
    } else {
      setFeedback('wrong')
      onWrongAnswer?.(ex.id)
    }
  }

  function next() {
    if (isLast) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setFeedback('idle')
    setMcSelected(null)
    setFbValue('')
    setTapValue('')
    setResetKey((k) => k + 1)
  }

  function canCheck(): boolean {
    switch (ex.type) {
      case 'multiple_choice':
      case 'listen_and_choose':
        return mcSelected !== null
      case 'fill_blank':
        return fbValue.trim().length > 0
      case 'tap_words_in_order':
        return tapValue.length > 0
      case 'match_pairs':
        return false
    }
  }

  function handleMatchComplete(extraMistakes: number) {
    if (extraMistakes === 0) {
      setCorrect((c) => c + 1)
      setFeedback('correct')
      onCorrectAnswer?.(ex.id)
    } else {
      setFeedback('wrong')
      onWrongAnswer?.(ex.id)
    }
  }

  function retry() {
    setSeed((s) => s + 1)
    setIndex(0)
    setCorrect(0)
    setFeedback('idle')
    setMcSelected(null)
    setFbValue('')
    setTapValue('')
    setResetKey((k) => k + 1)
    setDone(false)
  }

  if (total === 0) {
    return (
      <View
        style={[resultStyles.shell, { paddingTop: insets.top + space.lg }]}
      >
        <Text style={resultStyles.title}>Nothing to test yet</Text>
        <Text style={resultStyles.body}>
          This exam doesn't have any exercises bundled yet.
        </Text>
        <LedgeButton label="Back to home" tone="neutral" onPress={onBack} />
      </View>
    )
  }

  if (done) {
    return (
      <ScrollView
        contentContainerStyle={[
          resultStyles.shell,
          { paddingTop: insets.top + space.lg },
        ]}
      >
        <Image
          source={
            passed
              ? require('../../assets/mochi-happy.png')
              : require('../../assets/mochi-sad.png')
          }
          style={resultStyles.mochi}
        />
        <Text style={resultStyles.title}>{passed ? pass.title : fail.title}</Text>
        <Text style={resultStyles.score}>
          {correct} / {total} correct
        </Text>
        <Text style={resultStyles.body}>{passed ? pass.body : fail.body}</Text>
        <View style={resultStyles.actions}>
          {passed ? (
            <LedgeButton
              label={pass.cta ?? 'Continue'}
              tone="success"
              size="lg"
              onPress={() => {
                onPass()
                onBack()
              }}
            />
          ) : (
            <>
              <LedgeButton label="Try again" tone="primary" size="lg" onPress={retry} />
              <LedgeButton label="Back to home" tone="neutral" onPress={onBack} />
            </>
          )}
        </View>
      </ScrollView>
    )
  }

  return (
    <View style={styles.shell}>
      <View style={[styles.topbar, { paddingTop: insets.top + space.sm }]}>
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
        <View style={styles.counter}>
          <Text style={styles.counterText}>📝 {index + 1}/{total}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <ExerciseView
          ex={ex}
          locked={locked}
          mcSelected={mcSelected}
          setMcSelected={setMcSelected}
          fbValue={fbValue}
          setFbValue={setFbValue}
          setTapValue={setTapValue}
          onMatchComplete={handleMatchComplete}
          resetKey={resetKey}
        />
      </ScrollView>

      <View style={styles.footer}>
        {feedback === 'correct' && (
          <Text style={[styles.feedback, { color: colors.success700 }]}>✓ Correct!</Text>
        )}
        {feedback === 'wrong' && (
          <Text style={[styles.feedback, { color: colors.error700 }]}>{wrongMessage(ex)}</Text>
        )}
        {feedback === 'idle' && ex.type === 'match_pairs' ? (
          <LedgeButton
            label="Match all pairs to continue"
            tone="neutral"
            size="lg"
            disabled
          />
        ) : (
          <LedgeButton
            label={feedback === 'idle' ? 'Check' : isLast ? 'Finish' : 'Continue'}
            tone={feedback === 'wrong' ? 'error' : 'primary'}
            size="lg"
            disabled={feedback === 'idle' && !canCheck()}
            onPress={feedback === 'idle' ? check : next}
          />
        )}
      </View>
    </View>
  )
}

interface ExerciseViewProps {
  ex: Exercise
  locked: boolean
  mcSelected: string | null
  setMcSelected: (v: string) => void
  fbValue: string
  setFbValue: (v: string) => void
  setTapValue: (v: string) => void
  onMatchComplete: (mistakes: number) => void
  resetKey: number
}

function ExerciseView({
  ex,
  locked,
  mcSelected,
  setMcSelected,
  fbValue,
  setFbValue,
  setTapValue,
  onMatchComplete,
  resetKey,
}: ExerciseViewProps) {
  switch (ex.type) {
    case 'multiple_choice':
      return (
        <View style={styles.exRoot}>
          <Text style={styles.prompt}>{ex.prompt}</Text>
          <View style={styles.options}>
            {ex.options.map((opt) => {
              const isSel = mcSelected === opt
              const isCorrect = locked && opt === ex.answer
              const isWrong = locked && isSel && opt !== ex.answer
              return (
                <Pressable
                  key={opt}
                  onPress={() => !locked && setMcSelected(opt)}
                  style={[
                    styles.option,
                    isSel && !locked && styles.optionSelected,
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
    case 'fill_blank':
      return <FillBlank exercise={ex} value={fbValue} locked={locked} onChange={setFbValue} />
    case 'match_pairs':
      return (
        <MatchPairs
          exercise={ex}
          locked={locked}
          onComplete={onMatchComplete}
          resetKey={resetKey}
        />
      )
    case 'listen_and_choose':
      return (
        <ListenAndChoose
          exercise={ex}
          selected={mcSelected}
          locked={locked}
          onSelect={setMcSelected}
        />
      )
    case 'tap_words_in_order':
      return (
        <TapWordsInOrder
          exercise={ex}
          locked={locked}
          onChange={setTapValue}
          resetKey={resetKey}
        />
      )
  }
}

function grade(
  exercise: Exercise,
  inputs: { mcSelected: string | null; fbValue: string; tapValue: string }
): { correct: boolean } | null {
  switch (exercise.type) {
    case 'multiple_choice':
    case 'listen_and_choose':
      if (inputs.mcSelected === null) return null
      return { correct: inputs.mcSelected === exercise.answer }
    case 'fill_blank':
      if (inputs.fbValue.trim().length === 0) return null
      return { correct: checkFillBlank(inputs.fbValue, exercise) }
    case 'tap_words_in_order':
      if (inputs.tapValue.length === 0) return null
      return { correct: matchesSequenceAnswer(inputs.tapValue, exercise.answer) }
    case 'match_pairs':
      return null
  }
}

function wrongMessage(ex: Exercise): string {
  switch (ex.type) {
    case 'multiple_choice':
    case 'listen_and_choose':
      return `Correct: ${ex.answer}`
    case 'fill_blank':
      return `Answer: ${ex.answer}`
    case 'tap_words_in_order':
      return `Correct: ${ex.answer}`
    case 'match_pairs':
      return 'Some pairs were missed.'
  }
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
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
  counter: {
    backgroundColor: colors.cream100,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: colors.border,
  },
  counterText: { fontSize: fontSizes.xs, fontWeight: '800', color: colors.text },
  body: { padding: space.lg, gap: space.lg, flexGrow: 1 },
  eyebrow: {
    fontSize: fontSizes.xs,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.4,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  exRoot: { gap: space.lg },
  prompt: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: fontSizes.xxl * 1.3,
  },
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
})

const resultStyles = StyleSheet.create({
  shell: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
  },
  mochi: { width: 160, height: 160, resizeMode: 'contain' },
  title: {
    fontSize: fontSizes.hero - 4,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  score: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary500,
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.5,
    maxWidth: 360,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: space.sm,
    marginTop: space.lg,
  },
})
