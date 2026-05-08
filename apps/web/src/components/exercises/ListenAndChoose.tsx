import { useEffect } from 'react'
import type { ListenAndChooseExercise } from '@mochilang/shared'
import { speak } from '../../lib/tts'
import { useSettings } from '../../settings'
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
  const { state: settings } = useSettings()

  // Auto-play once on mount when the user has opted in.
  useEffect(() => {
    if (settings.autoPlayAudio) speak(exercise.spokenText)
  }, [exercise.spokenText, settings.autoPlayAudio])

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
              onClick={() => {
                // Speak the tapped option so the learner can compare it
                // to the prompt audio. This is the easiest way to drill
                // tone-pair distinctions (买/卖, 行 háng/行 xíng) — the
                // exercise becomes "is what I'm hearing the same as what
                // I'm tapping?" without authoring per-option audio.
                speak(opt)
                onSelect(opt)
              }}
            >
              <span className="ex-option-text ex-hanzi">{opt}</span>
              <span className="ex-option-listen" aria-hidden="true">🔊</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
