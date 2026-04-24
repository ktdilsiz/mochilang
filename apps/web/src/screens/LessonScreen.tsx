import { useState } from 'react'
import type { Lesson } from '../types'
import ExerciseCard from '../components/ExerciseCard'

interface Props {
  lesson: Lesson
  onComplete: (xpEarned: number) => void
  onBack: () => void
}

export default function LessonScreen({ lesson, onComplete, onBack }: Props) {
  const [index, setIndex] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [mistakes, setMistakes] = useState(0)

  const progress = index / lesson.exercises.length

  function handleAnswer(correct: boolean) {
    if (!correct) {
      setHearts((h) => h - 1)
      setMistakes((m) => m + 1)
    }
    if (index + 1 >= lesson.exercises.length) {
      onComplete(mistakes === 0 ? lesson.xp * 2 : lesson.xp)
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
        >
          ✕
        </button>
        <div style={{ flex: 1, height: 12, background: '#e5e7eb', borderRadius: 999 }}>
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: '#58cc02',
              borderRadius: 999,
              transition: 'width 0.3s',
            }}
          />
        </div>
        <span style={{ fontSize: '1.25rem' }}>{'❤️'.repeat(hearts)}</span>
      </div>

      <ExerciseCard exercise={lesson.exercises[index]} onAnswer={handleAnswer} />
    </div>
  )
}
