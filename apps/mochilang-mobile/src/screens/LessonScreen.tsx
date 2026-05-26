import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Exercise, Lesson } from '@mochilang/shared'
import { matchesSequenceAnswer, parseCourseId } from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import FillBlank, {
  checkAnswer as checkFillBlank,
} from '../components/exercises/FillBlank'
import MatchPairs from '../components/exercises/MatchPairs'
import ListenAndChoose from '../components/exercises/ListenAndChoose'
import TapWordsInOrder from '../components/exercises/TapWordsInOrder'
import Dialogue from '../components/exercises/Dialogue'
import TappableText from '../components/TappableText'
import { WordTranslationProvider } from '../lib/wordTranslation'
import { localeForOption, speak, targetLocaleForCourse } from '../lib/tts'
import { colors, fontSizes, radius, space } from '../lib/theme'

/**
 * Render a fill-blank prompt with the learner's answer slotted in,
 * stripped of quotes and parenthetical hints so the TTS reads cleanly.
 *
 *   "In ___, it is hot." (yaz)   +  "summer"
 *     → "In summer, it is hot."
 */
function fillSentence(prompt: string, answer: string): string {
  let s = prompt
  s = s.replace(/\s*\([^)]*\)\s*$/, '') // drop trailing parenthetical hint
  s = s.replace(/^['"]|['"]$/g, '') // strip outer quotes
  s = s.replace(/_+/g, answer.trim()) // fill the blank
  return s.trim()
}

interface Props {
  lesson: Lesson
  /** Active courseId — used to derive Lingva from/to languages for word taps. */
  courseId: string
  onComplete: (mistakes: number) => void
  onBack: () => void
  /** Optional — fires per-exercise on wrong answers (mistake tracking). */
  onWrongAnswer?: (exerciseId: string) => void
  /** Optional — fires per-exercise on correct answers. */
  onCorrectAnswer?: (exerciseId: string) => void
}

type Feedback = 'idle' | 'correct' | 'wrong'

/**
 * LessonScreen — dispatches each `Exercise` to its specialized component
 * and grades on the unified inputs (mcSelected / fbValue / tapValue) +
 * the match_pairs auto-complete callback. Mirrors the web LessonScreen.
 */
export default function LessonScreen({
  lesson,
  courseId,
  onComplete,
  onBack,
  onWrongAnswer,
  onCorrectAnswer,
}: Props) {
  const insets = useSafeAreaInsets()
  const [index, setIndex] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [resetKey, setResetKey] = useState(0)

  // Per-type input state. Lifted here so LessonScreen can grade on Check.
  const [mcSelected, setMcSelected] = useState<string | null>(null)
  const [fbValue, setFbValue] = useState('')
  const [tapValue, setTapValue] = useState('')

  // Shuffle exercises once per lesson attempt so the same lesson doesn't
  // drill the same sequence every time — defeats memorization without
  // changing content. `useMemo` is keyed on lesson.id so a re-attempt
  // (component remounts) gets a fresh shuffle, but mid-lesson re-renders
  // keep the order stable. Dialogue exercises are pinned to the end —
  // they read as a capstone scene and feel wrong opening cold.
  const exercises = useMemo(() => {
    const arr = [...lesson.exercises]
    const dialogues = arr.filter((e) => e.type === 'dialogue')
    const rest = arr.filter((e) => e.type !== 'dialogue')
    // Fisher-Yates on the non-dialogue chunk.
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rest[i], rest[j]] = [rest[j], rest[i]]
    }
    return [...rest, ...dialogues]
  }, [lesson.id, lesson.exercises])

  const ex = exercises[index]
  const isLast = index === exercises.length - 1
  const total = exercises.length
  const locked = feedback !== 'idle'

  function check() {
    if (locked) return
    const result = grade(ex, { mcSelected, fbValue, tapValue })
    if (!result) return
    if (result.correct) {
      setFeedback('correct')
      onCorrectAnswer?.(ex.id)
      // Play the completed target-language sentence so the learner
      // hears the answer in context. fill_blank reads as the prompt
      // with their answer slotted in; tap_words_in_order reads as the
      // sentence they assembled.
      const locale = targetLocaleForCourse(courseId)
      if (ex.type === 'fill_blank') {
        speak(fillSentence(ex.prompt, fbValue), { language: locale })
      } else if (ex.type === 'tap_words_in_order') {
        speak(tapValue, { language: locale })
      }
    } else {
      setFeedback('wrong')
      setMistakes((m) => m + 1)
      onWrongAnswer?.(ex.id)
    }
  }

  function next() {
    if (isLast) {
      onComplete(mistakes)
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
      case 'dialogue':
        return false
    }
  }

  // match_pairs auto-completes once all pairs match. Treat extraMistakes
  // (mismatches during the matching) the same as wrong attempts.
  function handleMatchComplete(extraMistakes: number) {
    if (extraMistakes > 0) {
      setMistakes((m) => m + extraMistakes)
      setFeedback('wrong')
      onWrongAnswer?.(ex.id)
    } else {
      setFeedback('correct')
      onCorrectAnswer?.(ex.id)
    }
  }

  // Translation tap-target wiring. Course id is `${target}-${source}`
  // where `target` is the language being learned and `source` is the
  // user's native. The TappableText component handles auto-detect +
  // smart direction internally, so we just hand it both codes.
  const parsed = parseCourseId(courseId)
  const targetLang = parsed?.target ?? 'en'
  const sourceLang = parsed?.source ?? 'en'

  return (
    <WordTranslationProvider
      value={{
        enabled: true,
        targetLang,
        sourceLang,
        wordTranslations: lesson.wordTranslations,
      }}
    >
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
        <Text style={styles.progressText}>
          {index + 1}/{total}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <ExerciseView
          ex={ex}
          courseId={courseId}
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
          <Text style={[styles.feedback, { color: colors.success700 }]}>
            ✓ Correct!
          </Text>
        )}
        {feedback === 'wrong' && (
          <Text style={[styles.feedback, { color: colors.error700 }]}>
            {wrongMessage(ex)}
          </Text>
        )}
        {feedback === 'idle' && ex.type === 'match_pairs' ? (
          <LedgeButton
            label="Match all pairs to continue"
            tone="neutral"
            size="lg"
            disabled
          />
        ) : feedback === 'idle' && ex.type === 'dialogue' ? (
          <LedgeButton
            label="Play through the dialogue"
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
    </WordTranslationProvider>
  )
}

interface ExerciseViewProps {
  ex: Exercise
  courseId: string
  locked: boolean
  mcSelected: string | null
  setMcSelected: (v: string) => void
  fbValue: string
  setFbValue: (v: string) => void
  setTapValue: (v: string) => void
  /** Reused for match_pairs AND dialogue — both report a final mistake count. */
  onMatchComplete: (mistakes: number) => void
  resetKey: number
}

function ExerciseView({
  ex,
  courseId,
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
          <TappableText text={ex.prompt} style={styles.prompt} />
          <View style={styles.options}>
            {ex.options.map((opt) => {
              const isSel = mcSelected === opt
              const isCorrect = locked && opt === ex.answer
              const isWrong = locked && isSel && opt !== ex.answer
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    if (locked) return
                    setMcSelected(opt)
                    speak(opt, {
                      language: localeForOption(
                        opt,
                        [ex.prompt, ...ex.options],
                        courseId,
                      ),
                    })
                  }}
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
      return (
        <FillBlank
          exercise={ex}
          value={fbValue}
          locked={locked}
          onChange={setFbValue}
        />
      )
    case 'match_pairs':
      return (
        <MatchPairs
          exercise={ex}
          courseId={courseId}
          locked={locked}
          onComplete={onMatchComplete}
          resetKey={resetKey}
        />
      )
    case 'listen_and_choose':
      return (
        <ListenAndChoose
          exercise={ex}
          courseId={courseId}
          selected={mcSelected}
          locked={locked}
          onSelect={setMcSelected}
        />
      )
    case 'tap_words_in_order':
      return (
        <TapWordsInOrder
          exercise={ex}
          courseId={courseId}
          locked={locked}
          onChange={setTapValue}
          resetKey={resetKey}
        />
      )
    case 'dialogue':
      return (
        <Dialogue
          exercise={ex}
          courseId={courseId}
          locked={locked}
          onComplete={onMatchComplete}
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
    case 'dialogue':
      // Both are self-driving — the inner component reports its result
      // via the onMatchComplete callback. There's no top-level Check.
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
    case 'dialogue':
      return 'You missed a turn or two — keep going!'
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
  progressText: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '700' },
  body: { padding: space.lg, gap: space.lg, flexGrow: 1 },
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
