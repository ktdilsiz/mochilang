import { useState } from 'react'
import type { Exercise } from '../types'

interface Props {
  exercise: Exercise
  onAnswer: (correct: boolean) => void
}

export default function ExerciseCard({ exercise, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)

  const userAnswer = exercise.type === 'multiple_choice' ? selected : input
  const isCorrect = userAnswer?.trim().toLowerCase() === exercise.answer.toLowerCase()

  function handleCheck() {
    if (!userAnswer) return
    setChecked(true)
  }

  function handleContinue() {
    onAnswer(isCorrect)
    setSelected(null)
    setInput('')
    setChecked(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{exercise.prompt}</p>

      {exercise.type === 'multiple_choice' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {exercise.options?.map((opt) => (
            <button
              key={opt}
              onClick={() => !checked && setSelected(opt)}
              style={{
                padding: '0.875rem',
                borderRadius: '0.5rem',
                border: `2px solid ${
                  checked
                    ? opt === exercise.answer
                      ? '#22c55e'
                      : opt === selected
                        ? '#ef4444'
                        : '#e5e7eb'
                    : selected === opt
                      ? '#3b82f6'
                      : '#e5e7eb'
                }`,
                background: checked
                  ? opt === exercise.answer
                    ? '#dcfce7'
                    : opt === selected
                      ? '#fee2e2'
                      : 'white'
                  : selected === opt
                    ? '#eff6ff'
                    : 'white',
                cursor: checked ? 'default' : 'pointer',
                fontWeight: selected === opt ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {exercise.type === 'fill_blank' && (
        <input
          type="text"
          value={input}
          onChange={(e) => !checked && setInput(e.target.value)}
          placeholder="Type your answer..."
          style={{
            padding: '0.875rem',
            borderRadius: '0.5rem',
            border: `2px solid ${checked ? (isCorrect ? '#22c55e' : '#ef4444') : '#e5e7eb'}`,
            fontSize: '1rem',
            outline: 'none',
          }}
        />
      )}

      {checked && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            background: isCorrect ? '#dcfce7' : '#fee2e2',
            color: isCorrect ? '#166534' : '#991b1b',
          }}
        >
          {isCorrect ? '✓ Correct!' : `✗ Correct answer: ${exercise.answer}`}
          {exercise.explanation && (
            <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>{exercise.explanation}</p>
          )}
        </div>
      )}

      <button
        onClick={checked ? handleContinue : handleCheck}
        disabled={!userAnswer}
        style={{
          padding: '0.875rem',
          borderRadius: '0.5rem',
          background: !userAnswer ? '#e5e7eb' : '#58cc02',
          color: !userAnswer ? '#9ca3af' : 'white',
          fontWeight: 700,
          fontSize: '1rem',
          border: 'none',
          cursor: !userAnswer ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {checked ? 'Continue' : 'Check'}
      </button>
    </div>
  )
}
