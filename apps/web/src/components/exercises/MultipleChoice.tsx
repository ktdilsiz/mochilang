import type { MultipleChoiceExercise } from '../../types'
import './exercise.css'

interface Props {
  exercise: MultipleChoiceExercise
  selected: string | null
  locked: boolean
  onSelect: (value: string) => void
}

export default function MultipleChoice({
  exercise,
  selected,
  locked,
  onSelect,
}: Props) {
  return (
    <div className="ex-root">
      <h2 className="ex-prompt">{exercise.prompt}</h2>
      <div className="ex-options">
        {exercise.options.map((opt) => {
          const isSelected = selected === opt
          const isCorrect = locked && opt === exercise.answer
          const isWrong = locked && isSelected && opt !== exercise.answer
          return (
            <button
              key={opt}
              type="button"
              disabled={locked}
              className={
                'ex-option ' +
                (isCorrect
                  ? 'ex-option-correct'
                  : isWrong
                    ? 'ex-option-wrong'
                    : isSelected
                      ? 'ex-option-selected'
                      : '')
              }
              onClick={() => onSelect(opt)}
            >
              <span className="ex-option-text">{opt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
