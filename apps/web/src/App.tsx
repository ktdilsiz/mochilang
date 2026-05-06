import { useEffect, useState } from 'react'
import type { Lesson, Language } from './types'
import { LESSONS_BY_COURSE } from './data/lessons'
import LanguageSelectScreen from './screens/LanguageSelectScreen'
import HomeScreen from './screens/HomeScreen'
import LessonScreen from './screens/LessonScreen'
import { useProgress } from './state'

type Screen = 'language-select' | 'home' | 'lesson'

const SELECTED_LANG_KEY = 'mochilang:selectedLanguage'

export default function App() {
  const [screen, setScreen] = useState<Screen>('language-select')
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const progress = useProgress()

  // Restore the language picker on next visit so users land back in their
  // course instead of re-selecting it every time.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SELECTED_LANG_KEY)
      if (raw) {
        const lang = JSON.parse(raw) as Language
        setSelectedLanguage(lang)
        setScreen('home')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const courseId = selectedLanguage ? `${selectedLanguage.code}-en` : null
  const lessons = courseId ? (LESSONS_BY_COURSE[courseId] ?? []) : []

  function handleLanguageSelect(lang: Language) {
    setSelectedLanguage(lang)
    try {
      localStorage.setItem(SELECTED_LANG_KEY, JSON.stringify(lang))
    } catch {
      /* ignore */
    }
    setScreen('home')
  }

  function handleLessonSelect(lesson: Lesson) {
    setActiveLesson(lesson)
    setScreen('lesson')
  }

  function handleLessonComplete(mistakes: number) {
    if (activeLesson) {
      progress.recordCompletion(activeLesson.id, mistakes, activeLesson.xp)
    }
    setScreen('home')
  }

  function handleSwitchLanguage() {
    try {
      localStorage.removeItem(SELECTED_LANG_KEY)
    } catch {
      /* ignore */
    }
    setSelectedLanguage(null)
    setScreen('language-select')
  }

  if (screen === 'language-select') {
    return <LanguageSelectScreen onSelect={handleLanguageSelect} />
  }

  if (screen === 'lesson' && activeLesson) {
    return (
      <LessonScreen
        lesson={activeLesson}
        onComplete={handleLessonComplete}
        onBack={() => setScreen('home')}
      />
    )
  }

  return (
    <HomeScreen
      lessons={lessons}
      progress={progress.state}
      isCompleted={progress.isCompleted}
      onSelect={handleLessonSelect}
      onSwitchLanguage={handleSwitchLanguage}
      language={selectedLanguage}
    />
  )
}
