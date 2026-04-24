import type { Lesson } from '../types'

interface Props {
  lessons: Lesson[]
  completedIds: Set<string>
  onSelect: (lesson: Lesson) => void
}

export default function HomeScreen({ lessons, completedIds, onSelect }: Props) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
        Learn Spanish
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Pick a lesson to start</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {lessons.map((lesson) => {
          const done = completedIds.has(lesson.id)
          return (
            <button
              key={lesson.id}
              onClick={() => onSelect(lesson)}
              style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: `2px solid ${done ? '#22c55e' : '#e5e7eb'}`,
                background: done ? '#f0fdf4' : 'white',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: '1rem' }}>{lesson.title}</p>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {lesson.description}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.5rem' }}>{done ? '✅' : '🔒'}</span>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {lesson.xp} XP
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
