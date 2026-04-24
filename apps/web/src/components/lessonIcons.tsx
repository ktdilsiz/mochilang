import type { Lesson, LessonTheme } from '../types'

type IconName = 'chat' | 'numbers' | 'check' | 'family' | 'food' | 'pin' | 'clock' | 'palette' | 'cloud'

function Svg({
  children,
  viewBox = '0 0 24 24',
}: {
  children: React.ReactNode
  viewBox?: string
}) {
  return (
    <svg
      width="28"
      height="28"
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function LessonIcon({ name }: { name: IconName }) {
  const s = {
    stroke: 'white',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'chat':
      return (
        <Svg>
          <path
            {...s}
            d="M7 18l-3 3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H10l-3 2z"
          />
          <path {...s} d="M8 9h8" />
          <path {...s} d="M8 12h6" />
        </Svg>
      )
    case 'numbers':
      return (
        <Svg>
          <path {...s} d="M8 4L6 20" />
          <path {...s} d="M16 4l-2 16" />
          <path {...s} d="M4 9h18" />
          <path {...s} d="M3 15h18" />
        </Svg>
      )
    case 'check':
      return (
        <Svg>
          <path {...s} d="M20 6L9 17l-5-5" />
        </Svg>
      )
    case 'family':
      return (
        <Svg>
          <path {...s} d="M8 10a3 3 0 1 0-0.001 0z" />
          <path {...s} d="M16 11a2.5 2.5 0 1 0-0.001 0z" />
          <path {...s} d="M3.5 20a5 5 0 0 1 9 0" />
          <path {...s} d="M13 20a4 4 0 0 1 7.5 0" />
        </Svg>
      )
    case 'food':
      return (
        <Svg>
          <path {...s} d="M7 3v8" />
          <path {...s} d="M9 3v8" />
          <path {...s} d="M7 7h2" />
          <path {...s} d="M8 11v10" />
          <path {...s} d="M15 3v18" />
          <path {...s} d="M15 3c2.5 2 2.5 6 0 8" />
        </Svg>
      )
    case 'pin':
      return (
        <Svg>
          <path {...s} d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
          <path {...s} d="M12 10.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" />
        </Svg>
      )
    case 'clock':
      return (
        <Svg>
          <path {...s} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
          <path {...s} d="M12 7v5l3 2" />
        </Svg>
      )
    case 'palette':
      return (
        <Svg>
          <path
            {...s}
            d="M12 3c5 0 9 3.6 9 8.1 0 3.3-2.6 4.1-4.2 4.1H15c-1.3 0-2 .7-2 1.6 0 1.3 1 1.8 1 3.1 0 1.2-1.3 2.1-3 2.1-5 0-9-3.6-9-9S7 3 12 3z"
          />
          <path {...s} d="M7.5 10.2h0.01" />
          <path {...s} d="M10 8.1h0.01" />
          <path {...s} d="M14 8.1h0.01" />
          <path {...s} d="M16.5 10.2h0.01" />
        </Svg>
      )
    case 'cloud':
    default:
      return (
        <Svg>
          <path
            {...s}
            d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.4 8.8 3.8 3.8 0 0 0 7 18z"
          />
        </Svg>
      )
  }
}

function pickIconNameByTheme(theme: LessonTheme): IconName {
  switch (theme) {
    case 'numbers':
      return 'numbers'
    case 'family':
      return 'family'
    case 'food':
      return 'food'
    case 'location':
    case 'directions':
      return 'pin'
    case 'time':
      return 'clock'
    case 'colors':
      return 'palette'
    case 'weather':
      return 'cloud'
    case 'basics':
    case 'questions':
    case 'verbs':
    case 'greetings':
    case 'review':
    default:
      return 'chat'
  }
}

export function iconForLesson(lesson: Lesson, opts?: { completed?: boolean }): React.ReactNode {
  if (opts?.completed) return <LessonIcon name="check" />
  return <LessonIcon name={pickIconNameByTheme(lesson.theme)} />
}

