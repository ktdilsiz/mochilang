import { useEffect, useState } from 'react'
import type { Lesson } from '../types'
import SquareButton from '../components/SquareButton'
import LessonPopover from '../components/LessonPopover'
import { iconForLesson } from '../components/lessonIcons'

interface Props {
  lessons: Lesson[]
  completedIds: Set<string>
  onSelect: (lesson: Lesson) => void
}

export default function HomeScreen({ lessons, completedIds, onSelect }: Props) {
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null)

  const maxOffsetPx = 120
  const step = Math.PI / 4

  useEffect(() => {
    function onPointerDownCapture(e: PointerEvent) {
      // If pointer down is inside any lesson item, let the button handler manage open/switch.
      const target = e.target as Element | null
      const lessonItemEl = target?.closest?.('[data-lesson-item]')
      if (lessonItemEl) return
      setOpenLesson(null)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenLesson(null)
    }

    window.addEventListener('pointerdown', onPointerDownCapture, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDownCapture, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!openLesson) return
    const openId = openLesson.id

    const padding = 12

    // Wait for the popover to mount and layout.
    const raf1 = window.requestAnimationFrame(() => {
      const raf2 = window.requestAnimationFrame(() => {
        const item = document.querySelector(`[data-lesson-item="${openId}"]`) as HTMLElement | null
        const panel = item?.querySelector('.lessonPop__panel') as HTMLElement | null
        if (!panel) return

        const rect = panel.getBoundingClientRect()

        if (rect.bottom > window.innerHeight - padding) {
          const delta = rect.bottom - (window.innerHeight - padding)
          window.scrollBy({ top: delta, behavior: 'smooth' })
        } else if (rect.top < padding) {
          const delta = rect.top - padding
          window.scrollBy({ top: delta, behavior: 'smooth' })
        }
      })
      return () => window.cancelAnimationFrame(raf2)
    })

    return () => window.cancelAnimationFrame(raf1)
  }, [openLesson])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
        Learn Spanish
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Pick a lesson to start</p>

      <div className="lessonPath">
        {lessons.map((lesson, idx) => {
          const done = completedIds.has(lesson.id)
          const locked = false
          const offset = Math.round(Math.sin(idx * step) * maxOffsetPx)
          const isOpen = openLesson?.id === lesson.id
          const isSpacer = (idx + 1 - 3) % 4 === 0
          return (
            <div
              key={lesson.id}
              className={`lessonPathRow ${isOpen ? 'lessonPathRow--open' : ''} ${
                isSpacer ? 'lessonPathRow--spacer' : ''
              }`}
            >
              <div
                className={`lessonPathItem ${isOpen ? 'lessonPathItem--open' : ''}`}
                data-lesson-item={lesson.id}
                style={{ transform: `translateX(${offset}px)` }}
              >
                <SquareButton
                  ariaLabel={`Open lesson: ${lesson.title}`}
                  tone={locked ? 'locked' : done ? 'success' : 'default'}
                  disabled={locked}
                  onClick={() => setOpenLesson(lesson)}
                  icon={iconForLesson(lesson, { completed: done })}
                />
                {isOpen ? (
                  <LessonPopover
                    lesson={lesson}
                    onStart={(l) => {
                      setOpenLesson(null)
                      onSelect(l)
                    }}
                  />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
