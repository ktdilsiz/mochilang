import { useState } from 'react'
import type { Exercise, Lesson } from '../types'
import MultipleChoice from '../components/exercises/MultipleChoice'
import FillBlank, { checkAnswer as checkFillBlank } from '../components/exercises/FillBlank'
import MatchPairs from '../components/exercises/MatchPairs'
import ListenAndChoose from '../components/exercises/ListenAndChoose'
import TapWordsInOrder from '../components/exercises/TapWordsInOrder'
import mochiHappy from '../assets/mochi-happy.png'
import mochiSad from '../assets/mochi-sad.png'
import { playCorrect, playWrong, playLessonComplete } from '../lib/sounds'
import './LessonScreen.css'

interface Props {
  lesson: Lesson
  onComplete: (mistakes: number) => void
  onBack: () => void
}

const STARTING_HEARTS = 3

type Feedback =
  | { kind: 'idle' }
  | { kind: 'correct' }
  | { kind: 'wrong'; message?: string }

export default function LessonScreen({ lesson, onComplete, onBack }: Props) {
  const [index, setIndex] = useState(0)
  const [hearts, setHearts] = useState(STARTING_HEARTS)
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' })
  const [resetKey, setResetKey] = useState(0)

  const [mcSelected, setMcSelected] = useState<string | null>(null)
  const [fbValue, setFbValue] = useState('')
  const [tapValue, setTapValue] = useState('')

  const exercise = lesson.exercises[index]
  const progress = (index + (feedback.kind === 'idle' ? 0 : 1)) / lesson.exercises.length
  const locked = feedback.kind !== 'idle'
  const isLast = index >= lesson.exercises.length - 1

  function check() {
    if (locked) return
    const result = grade(exercise, { mcSelected, fbValue, tapValue })
    if (!result) return
    if (result.correct) {
      playCorrect()
      setFeedback({ kind: 'correct' })
    } else {
      playWrong()
      setHearts((h) => Math.max(0, h - 1))
      setMistakes((m) => m + 1)
      setFeedback({ kind: 'wrong' })
    }
  }

  function continueLesson() {
    if (isLast) {
      playLessonComplete()
      onComplete(mistakes)
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
    if (extraMistakes > 0) {
      setHearts((h) => Math.max(0, h - extraMistakes))
      setMistakes((m) => m + extraMistakes)
    }
    if (extraMistakes === 0) playCorrect()
    setFeedback({ kind: extraMistakes === 0 ? 'correct' : 'wrong' })
  }

  return (
    <div className="lesson-shell">
      <header className="lesson-topbar">
        <button
          type="button"
          className="lesson-close"
          onClick={onBack}
          aria-label="Quit lesson"
        >
          ✕
        </button>
        <div className="lesson-progress">
          <div
            className="lesson-progress-fill"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <div
          className="lesson-hearts"
          aria-label={`${hearts} hearts remaining`}
          data-empty={hearts === 0}
        >
          <span className="lesson-hearts-icon">❤</span>
          <span className="lesson-hearts-count">{hearts}</span>
        </div>
      </header>

      <main className="lesson-body">
        <ExerciseSwitch
          exercise={exercise}
          locked={locked}
          mcSelected={mcSelected}
          setMcSelected={setMcSelected}
          fbValue={fbValue}
          setFbValue={setFbValue}
          tapValue={tapValue}
          setTapValue={setTapValue}
          onMatchComplete={handleMatchComplete}
          resetKey={resetKey}
        />
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
        {feedback.kind === 'correct' && (
          <div className="lesson-feedback">
            <img src={mochiHappy} alt="" className="lesson-feedback-mochi" />
            <div>
              <div className="lesson-feedback-title">Nice!</div>
              {exercise.explanation && (
                <div className="lesson-feedback-body">{exercise.explanation}</div>
              )}
            </div>
          </div>
        )}
        {feedback.kind === 'wrong' && (
          <div className="lesson-feedback">
            <img src={mochiSad} alt="" className="lesson-feedback-mochi" />
            <div>
              <div className="lesson-feedback-title">Not quite.</div>
              {exercise.explanation && (
                <div className="lesson-feedback-body">{exercise.explanation}</div>
              )}
            </div>
          </div>
        )}
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
            onClick={continueLesson}
            autoFocus
          >
            {isLast ? 'Finish' : 'Continue'}
          </button>
        )}
        {feedback.kind === 'wrong' && (
          <button
            type="button"
            className="ledge-button size-lg tone-error"
            onClick={continueLesson}
            autoFocus
          >
            {isLast ? 'Finish' : 'Got it'}
          </button>
        )}
      </footer>
    </div>
  )
}

function ExerciseSwitch(props: {
  exercise: Exercise
  locked: boolean
  mcSelected: string | null
  setMcSelected: (v: string) => void
  fbValue: string
  setFbValue: (v: string) => void
  tapValue: string
  setTapValue: (v: string) => void
  onMatchComplete: (mistakes: number) => void
  resetKey: number
}) {
  const {
    exercise,
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
      return { correct: inputs.tapValue === exercise.answer }
    case 'match_pairs':
      return null
  }
}
