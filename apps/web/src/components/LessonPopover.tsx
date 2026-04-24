import type { Lesson } from '../types'

interface Props {
  lesson: Lesson
  onStart: (lesson: Lesson) => void
}

export default function LessonPopover({ lesson, onStart }: Props) {
  return (
    <div className="lessonPop lessonPop--open">
      <div className="lessonPop__panel" role="dialog" aria-label={lesson.title}>
        <div className="lessonPop__title">{lesson.title}</div>
        <div className="lessonPop__desc">{lesson.description}</div>
        <div className="lessonPop__meta">
          <span className="pill">{lesson.xp} XP</span>
          <span className="pill">{lesson.exercises.length} exercises</span>
        </div>
        <button type="button" className="primaryBtn" onClick={() => onStart(lesson)}>
          Start
        </button>
      </div>
    </div>
  )
}

