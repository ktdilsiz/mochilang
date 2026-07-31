import type { Lesson, LessonTheme } from '@mochilang/shared'
import { LessonIcon } from './lessonIcons'

export function iconForLesson(lesson: Lesson, opts?: { completed?: boolean }): React.ReactNode {
  if (opts?.completed) return <LessonIcon name="check" />
  return <LessonIcon name={pickIconNameByTheme(lesson.theme)} />
}

function pickIconNameByTheme(theme: LessonTheme) {
  switch (theme) {
    case 'numbers': return 'numbers'
    case 'family': return 'family'
    case 'food': return 'food'
    case 'location':
    case 'directions': return 'pin'
    case 'time': return 'clock'
    case 'colors': return 'palette'
    case 'weather': return 'cloud'
    default: return 'chat'
  }
}
