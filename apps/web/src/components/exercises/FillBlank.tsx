import type { FillBlankExercise } from '../../types'
import './exercise.css'

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
    <div className="ex-root">
      <h2 className="ex-prompt">{exercise.prompt}</h2>
      <input
        type="text"
        className={
          'ex-input ' +
          (isCorrect ? 'ex-input-correct' : isWrong ? 'ex-input-wrong' : '')
        }
        value={value}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer…"
        autoFocus
      />
      {locked && !isCorrect && (
        <div className="ex-correction">
          Answer: <strong>{exercise.answer}</strong>
        </div>
      )}
    </div>
  )
}

export function checkAnswer(value: string, exercise: FillBlankExercise): boolean {
  const normalized = value.trim().toLowerCase()
  if (normalized === exercise.answer.trim().toLowerCase()) return true
  return (exercise.acceptableAnswers ?? []).some(
    (a) => normalized === a.trim().toLowerCase()
  )
}
