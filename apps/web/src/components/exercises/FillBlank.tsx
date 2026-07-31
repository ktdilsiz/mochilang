import type { FillBlankExercise, TranslateExercise } from '@mochilang/shared'
import { matchesAnswer } from '@mochilang/shared'
import './exercise.css'

interface Props {
  exercise: FillBlankExercise | TranslateExercise
  value: string
  locked: boolean
  onChange: (v: string) => void
}

export default function FillBlank({ exercise, value, locked, onChange }: Props) {
  const isCorrect = locked && checkAnswer(value, exercise)
  const isWrong = locked && !isCorrect
  const promptText =
    ('prompt' in exercise && exercise.prompt)
      ? exercise.prompt
      : ('source' in exercise ? exercise.source : '')
  return (
    <div className="ex-root">
      <h2 className="ex-prompt">{promptText}</h2>
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

/**
 * Re-exported from @mochilang/shared so existing call sites keep
 * compiling. The shared implementation normalizes case, Unicode form,
 * smart quotes, dash variants, and full-width Chinese punctuation
 * before comparing — see packages/shared/src/answers.ts.
 */
export function checkAnswer(
  value: string,
  exercise: FillBlankExercise | TranslateExercise
): boolean {
  return matchesAnswer(value, exercise)
}
