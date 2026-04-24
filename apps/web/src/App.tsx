import { useState } from 'react'
import type { Lesson, Language } from './types'
import { LESSONS_BY_COURSE } from './data/lessons'
import LanguageSelectScreen from './screens/LanguageSelectScreen'
import HomeScreen from './screens/HomeScreen'
import LessonScreen from './screens/LessonScreen'

type Screen = 'language-select' | 'home' | 'lesson'

export default function App() {
  const [screen, setScreen] = useState<Screen>('language-select')
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [totalXP, setTotalXP] = useState(0)

  const courseId = selectedLanguage ? `${selectedLanguage.code}-en` : null
  const lessons = courseId ? (LESSONS_BY_COURSE[courseId] ?? []) : []

  function handleLanguageSelect(lang: Language) {
    setSelectedLanguage(lang)
    setCompletedIds(new Set())
    setScreen('home')
  }

  function handleLessonSelect(lesson: Lesson) {
    setActiveLesson(lesson)
    setScreen('lesson')
  }

  function handleComplete(xp: number) {
    if (activeLesson) {
      setCompletedIds((prev) => new Set(prev).add(activeLesson.id))
      setTotalXP((prev) => prev + xp)
    }
    setScreen('home')
  }

  if (screen === 'language-select') {
    return <LanguageSelectScreen onSelect={handleLanguageSelect} />
  }

  if (screen === 'lesson' && activeLesson) {
    return (
      <LessonScreen
        lesson={activeLesson}
        onComplete={handleComplete}
        onBack={() => setScreen('home')}
      />
    )
  }

  return (
    <>
      <div
        style={{
          background: '#58cc02',
          color: 'white',
          textAlign: 'center',
          padding: '0.5rem',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => setScreen('language-select')}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          ← Change
        </button>
        <span>
          {selectedLanguage?.flag} {selectedLanguage?.name} · {totalXP} XP
        </span>
        <div style={{ width: 60 }} />
      </div>
      <HomeScreen lessons={lessons} completedIds={completedIds} onSelect={handleLessonSelect} />
    </>
  )
}
