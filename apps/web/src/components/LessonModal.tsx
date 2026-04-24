import type { Lesson } from '../types'
import Modal from './Modal'

interface Props {
  open: boolean
  lesson: Lesson | null
  onClose: () => void
  onStart: (lesson: Lesson) => void
}

export default function LessonModal({ open, lesson, onClose, onStart }: Props) {
  return (
    <Modal
      open={open && !!lesson}
      title={lesson?.title}
      onClose={onClose}
      initialFocusSelector="[data-autofocus]"
    >
      {lesson ? (
        <div className="lessonModal">
          <p className="lessonModalDesc">{lesson.description}</p>
          <div className="lessonModalMeta">
            <span className="pill">{lesson.xp} XP</span>
            <span className="pill">{lesson.exercises.length} exercises</span>
          </div>
          <button
            type="button"
            data-autofocus
            className="primaryBtn"
            onClick={() => onStart(lesson)}
          >
            Start
          </button>
        </div>
      ) : null}
    </Modal>
  )
}

