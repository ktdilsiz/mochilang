import { useMemo, useState, type ReactNode } from 'react'
import type { Exercise } from '@mochilang/shared'
import MultipleChoice from '../components/exercises/MultipleChoice'
import FillBlank, { checkAnswer as checkFillBlank } from '../components/exercises/FillBlank'
import { matchesSequenceAnswer } from '@mochilang/shared'
import MatchPairs from '../components/exercises/MatchPairs'
import ListenAndChoose from '../components/exercises/ListenAndChoose'
import TapWordsInOrder from '../components/exercises/TapWordsInOrder'
import mochiHappy from '../assets/mochi-happy.png'
import mochiSad from '../assets/mochi-sad.png'
import { playCorrect, playWrong, playLessonComplete } from '../lib/sounds'
import './LessonScreen.css'
import './ExamScreen.css'

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
  /** Optional — fires when the user gets an exercise wrong. */
  onWrongAnswer?: (exerciseId: string) => void
  /** Optional — fires when the user gets an exercise right. */
  onCorrectAnswer?: (exerciseId: string) => void
}

type Feedback =
  | { kind: 'idle' }
  | { kind: 'correct' }
  | { kind: 'wrong' }

/**
 * Generic exam runner — hosts a fixed deck of exercises (provided by
 * `getQuestions`) and reports a final correct count. Both the topic-
 * skip and level-skip exams ride on top of this; differences are
 * pushed up via the `pass`/`fail` copy and the threshold.
 *
 * Hearts/streak don't apply — only the final correct-count matters.
 * Passing fires `onPass`, which the caller uses to mark the relevant
 * topic/level as cleared. Failing routes to a "Try again / Quit"
 * screen so the learner can re-attempt without restarting from home.
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
  // Re-roll seed bumps on retry so the second attempt isn't the same deck.
  const [seed, setSeed] = useState(0)
  const questions = useMemo<Exercise[]>(
    () => getQuestions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed]
  )
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' })
  const [resetKey, setResetKey] = useState(0)
  const [mcSelected, setMcSelected] = useState<string | null>(null)
  const [fbValue, setFbValue] = useState('')
  const [tapValue, setTapValue] = useState('')
  const [done, setDone] = useState(false)

  const total = questions.length
  const exercise = questions[index]
  const locked = feedback.kind !== 'idle'
  const isLast = index >= total - 1
  const progress = (index + (locked ? 1 : 0)) / Math.max(1, total)
  const passed = total > 0 && correct / total >= passThreshold

  function check() {
    if (locked) return
    const result = grade(exercise, { mcSelected, fbValue, tapValue })
    if (!result) return
    if (result.correct) {
      setCorrect((c) => c + 1)
      playCorrect()
      setFeedback({ kind: 'correct' })
      onCorrectAnswer?.(exercise.id)
    } else {
      playWrong()
      setFeedback({ kind: 'wrong' })
      onWrongAnswer?.(exercise.id)
    }
  }

  function continueExam() {
    if (isLast) {
      playLessonComplete()
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setFeedback({ kind: 'idle' })
    setMcSelected(null)
    setFbValue('')
    setTapValue('')
    setResetKey((k) => k + 1)
  }

  function canCheck(): boolean {
    switch (exercise.type) {
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
      playCorrect()
      setFeedback({ kind: 'correct' })
      onCorrectAnswer?.(exercise.id)
    } else {
      playWrong()
      setFeedback({ kind: 'wrong' })
      onWrongAnswer?.(exercise.id)
    }
  }

  function retry() {
    setSeed((s) => s + 1)
    setIndex(0)
    setCorrect(0)
    setFeedback({ kind: 'idle' })
    setMcSelected(null)
    setFbValue('')
    setTapValue('')
    setResetKey((k) => k + 1)
    setDone(false)
  }

  if (total === 0) {
    return (
      <div className="exam-result-shell">
        <h1 className="exam-result-title">Nothing to test yet</h1>
        <p className="exam-result-body">
          This exam doesn't have any exercises bundled yet.
        </p>
        <button
          type="button"
          className="ledge-button tone-neutral"
          onClick={onBack}
        >
          Back to home
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="exam-result-shell">
        <img
          src={passed ? mochiHappy : mochiSad}
          alt=""
          className="exam-result-mochi"
        />
        <h1 className="exam-result-title">{passed ? pass.title : fail.title}</h1>
        <p className="exam-result-score">
          {correct} / {total} correct
        </p>
        <p className="exam-result-body">{passed ? pass.body : fail.body}</p>
        <div className="exam-result-actions">
          {passed ? (
            <button
              type="button"
              className="ledge-button tone-success size-lg"
              onClick={() => {
                onPass()
                onBack()
              }}
            >
              {pass.cta ?? 'Continue'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ledge-button tone-primary size-lg"
                onClick={retry}
              >
                Try again
              </button>
              <button
                type="button"
                className="ledge-button tone-neutral"
                onClick={onBack}
              >
                Back to home
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="lesson-shell">
      <header className="lesson-topbar">
        <button
          type="button"
          className="lesson-close"
          onClick={onBack}
          aria-label="Quit exam"
        >
          ✕
        </button>
        <div className="lesson-progress">
          <div
            className="lesson-progress-fill"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <div className="exam-counter" aria-label={`Question ${index + 1} of ${total}`}>
          <span className="exam-counter-icon">📝</span>
          <span>
            {Math.min(index + 1, total)}/{total}
          </span>
        </div>
      </header>

      <main className="lesson-body">
        <div className="exam-eyebrow">{eyebrow}</div>
        {renderExercise(exercise, {
          locked,
          mcSelected,
          setMcSelected,
          fbValue,
          setFbValue,
          setTapValue,
          onMatchComplete: handleMatchComplete,
          resetKey,
        })}
      </main>

      <footer
        className={
          'lesson-footer ' +
          (feedback.kind === 'correct'
            ? 'lesson-footer-correct'
            : feedback.kind === 'wrong'
              ? 'lesson-footer-wrong'
              : '')
        }
      >
        {feedback.kind === 'idle' &&
          (exercise.type === 'match_pairs' ? (
            <button type="button" className="ledge-button size-lg tone-neutral" disabled>
              Match all pairs to continue
            </button>
          ) : (
            <button
              type="button"
              className="ledge-button size-lg tone-primary"
              disabled={!canCheck()}
              onClick={check}
            >
              Check
            </button>
          ))}
        {feedback.kind === 'correct' && (
          <button
            type="button"
            className="ledge-button size-lg tone-success"
            onClick={continueExam}
            autoFocus
          >
            {isLast ? 'Finish' : 'Continue'}
          </button>
        )}
        {feedback.kind === 'wrong' && (
          <button
            type="button"
            className="ledge-button size-lg tone-error"
            onClick={continueExam}
            autoFocus
          >
            {isLast ? 'Finish' : 'Got it'}
          </button>
        )}
      </footer>
    </div>
  )
}

interface RenderInputs {
  locked: boolean
  mcSelected: string | null
  setMcSelected: (v: string) => void
  fbValue: string
  setFbValue: (v: string) => void
  setTapValue: (v: string) => void
  onMatchComplete: (mistakes: number) => void
  resetKey: number
}

function renderExercise(exercise: Exercise, props: RenderInputs) {
  const {
    locked,
    mcSelected,
    setMcSelected,
    fbValue,
    setFbValue,
    setTapValue,
    onMatchComplete,
    resetKey,
  } = props
  switch (exercise.type) {
    case 'multiple_choice':
      return (
        <MultipleChoice
          exercise={exercise}
          selected={mcSelected}
          locked={locked}
          onSelect={setMcSelected}
        />
      )
    case 'fill_blank':
      return (
        <FillBlank
          exercise={exercise}
          value={fbValue}
          locked={locked}
          onChange={setFbValue}
        />
      )
    case 'match_pairs':
      return (
        <MatchPairs
          exercise={exercise}
          locked={locked}
          onComplete={onMatchComplete}
          resetKey={resetKey}
        />
      )
    case 'listen_and_choose':
      return (
        <ListenAndChoose
          exercise={exercise}
          selected={mcSelected}
          locked={locked}
          onSelect={setMcSelected}
        />
      )
    case 'tap_words_in_order':
      return (
        <TapWordsInOrder
          exercise={exercise}
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
