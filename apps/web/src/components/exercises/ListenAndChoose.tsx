import { useEffect } from 'react'
import type { ListenAndChooseExercise } from '../../types'
import { speak } from '../../lib/tts'
import './exercise.css'

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
  // Auto-play once on mount.
  useEffect(() => {
    speak(exercise.spokenText)
  }, [exercise.spokenText])

  return (
    <div className="ex-root">
      <h2 className="ex-prompt">{exercise.prompt}</h2>
      <button
        type="button"
        className="ex-listen-btn"
        onClick={() => speak(exercise.spokenText)}
        aria-label="Play audio"
      >
        🔊 Play again
      </button>
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
              <span className="ex-option-text ex-hanzi">{opt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
