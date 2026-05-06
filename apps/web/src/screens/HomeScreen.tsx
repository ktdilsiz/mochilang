import { useEffect, useState } from 'react'
import type { Language, Lesson } from '../types'
import type { ProgressState } from '../state'
import { iconForLesson } from '../components/lessonIcons'
import mochiThinking from '../assets/mochi-thinking.png'
import './HomeScreen.css'

interface Props {
  lessons: Lesson[]
  language: Language | null
  progress: ProgressState
  isCompleted: (id: string) => boolean
  onSelect: (lesson: Lesson) => void
  onSwitchLanguage: () => void
}

export default function HomeScreen({
  lessons,
  language,
  progress,
  isCompleted,
  onSelect,
  onSwitchLanguage,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  // Index of the next-up lesson (first not-completed)
  const nextIdx = lessons.findIndex((l) => !isCompleted(l.id))
  const nextId = nextIdx >= 0 ? lessons[nextIdx].id : null

  useEffect(() => {
    function close(e: PointerEvent) {
      const target = e.target as Element | null
      if (target?.closest?.('[data-lesson]')) return
      setOpenId(null)
    }
    window.addEventListener('pointerdown', close, true)
    return () => window.removeEventListener('pointerdown', close, true)
  }, [])

  return (
    <div className="home-shell">
      <header className="home-topbar">
        <button
          type="button"
          className="home-lang-pill"
          onClick={onSwitchLanguage}
          aria-label="Switch language"
        >
          <span className="home-lang-flag">{language?.flag}</span>
          <span className="home-lang-name">{language?.name ?? 'Pick course'}</span>
          <span className="home-lang-chev">▾</span>
        </button>

        <div className="home-stats">
          <span className="home-stat home-stat-streak" title="Streak">
            🔥 <span>{progress.streak}</span>
          </span>
          <span className="home-stat home-stat-xp" title="Total XP">
            ⚡ <span>{progress.totalXp}</span>
          </span>
        </div>
      </header>

      <section className="home-hero card">
        <img src={mochiThinking} alt="" className="home-hero-mochi" />
        <div className="home-hero-text">
          <div className="home-hero-eyebrow">Section 1</div>
          <h2 className="home-hero-title">
            {language?.name ?? 'Chinese'} basics
          </h2>
          <p className="home-hero-body">
            Tap a lesson to begin. Mochi believes in you.
          </p>
        </div>
      </section>

      <div className="home-path">
        {lessons.map((lesson, idx) => {
          const done = isCompleted(lesson.id)
          const isNext = lesson.id === nextId
          const isOpen = openId === lesson.id
          const offset = Math.sin(idx * (Math.PI / 4)) * 80
          return (
            <div
              key={lesson.id}
              className={
                'home-path-row ' + (isOpen ? 'home-path-row-open' : '')
              }
              style={{ ['--offset' as never]: `${offset}px` }}
              data-lesson={lesson.id}
            >
              <button
                type="button"
                className={
                  'home-node ' +
                  (done
                    ? 'home-node-done'
                    : isNext
                      ? 'home-node-next'
                      : 'home-node-default')
                }
                data-theme={lesson.theme}
                onClick={() => setOpenId(isOpen ? null : lesson.id)}
                aria-label={`${lesson.title}${done ? ' (completed)' : ''}`}
              >
                {iconForLesson(lesson, { completed: done })}
                {isNext && !done && <span className="home-node-pulse" />}
              </button>

              {isOpen && (
                <div
                  className="home-popover card"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="home-pop-eyebrow">
                    {done ? 'Completed' : isNext ? 'Up next' : 'Locked-in path'}
                  </div>
                  <div className="home-pop-title">{lesson.title}</div>
                  <p className="home-pop-body">{lesson.description}</p>
                  <div className="home-pop-meta">
                    <span className="home-pill">⚡ {lesson.xp} XP</span>
                    <span className="home-pill">
                      {lesson.exercises.length} exercises
                    </span>
                  </div>
                  <button
                    type="button"
                    className={
                      'ledge-button ' +
                      (done ? 'tone-success' : 'tone-primary') +
                      ' size-lg home-pop-btn'
                    }
                    onClick={() => {
                      setOpenId(null)
                      onSelect(lesson)
                    }}
                  >
                    {done ? 'Practice again' : 'Start'}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {lessons.length === 0 && (
          <div className="home-empty">
            <img src={mochiThinking} alt="" className="home-empty-mochi" />
            <h3>No lessons yet</h3>
            <p>This course is being built. Try a different language for now.</p>
          </div>
        )}
      </div>
    </div>
  )
}
