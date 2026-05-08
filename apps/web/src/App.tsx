import { useEffect, useState } from 'react'
import type { Lesson, Level, Topic } from '@mochilang/shared'
import { findLanguage, parseCourseId } from '@mochilang/shared'
import { useCourse } from './data/lessons'
import LanguageSelectScreen from './screens/LanguageSelectScreen'
import LoginScreen from './screens/LoginScreen'
import HomeScreen from './screens/HomeScreen'
import LessonScreen from './screens/LessonScreen'
import LeagueScreen from './screens/LeagueScreen'
import FriendsScreen from './screens/FriendsScreen'
import ProfileScreen from './screens/ProfileScreen'
import TopicGuideScreen from './screens/TopicGuideScreen'
import SettingsScreen from './screens/SettingsScreen'
import TopicExamScreen from './screens/TopicExamScreen'
import LevelExamScreen from './screens/LevelExamScreen'
import LevelExamIntroScreen from './screens/LevelExamIntroScreen'
import PracticeMistakesScreen from './screens/PracticeMistakesScreen'
import BottomNav, { type Tab } from './components/BottomNav'
import ProfileSetup from './components/ProfileSetup'
import { useProgress } from './state'
import { useProfile } from './profile'
import { useSettings } from './settings'
import { useTopicExams } from './topicExams'
import { useLevelExams } from './levelExams'
import { useMistakes } from './mistakes'
import {
  locateExercise,
  mistakesForLesson,
  mistakesForLevel,
  mistakesForTopic,
} from '@mochilang/shared'
import { api, ApiError, setOfflineMode } from '@mochilang/shared'

/**
 * Auth states:
 *   - checking   : initial /api/auth/me in flight
 *   - signed-out : API reachable, no session — show LoginScreen
 *   - signed-in  : authenticated, full API mode
 *   - offline    : explicitly skipped login OR API unreachable; localStorage only
 */
type AuthState = 'checking' | 'signed-out' | 'signed-in' | 'offline'
type Screen =
  | 'language-select'
  | 'tabs'
  | 'lesson'
  | 'guide'
  | 'settings'
  | 'exam'
  | 'level-exam-intro'
  | 'level-exam'
  | 'practice-mistakes'

interface PracticeScope {
  /** Display label for the practice screen eyebrow. */
  label: string
  /** Exercise ids to drill, captured at open time. */
  ids: string[]
}

const SELECTED_COURSE_KEY = 'mochilang:selectedCourse'
const LEGACY_SELECTED_LANG_KEY = 'mochilang:selectedLanguage'

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const { state: settings } = useSettings()

  // Reflect the theme preference on <html> so CSS can branch on
  // `[data-theme="dark"]`. `system` clears the attribute and lets
  // `prefers-color-scheme` take over.
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', settings.theme)
    }
  }, [settings.theme])

  // Toggle a class so screens can disable transition/animation rules
  // when the user prefers reduced motion.
  useEffect(() => {
    document.documentElement.classList.toggle('no-anim', !settings.animations)
  }, [settings.animations])

  // `authVersion` increments on logout so the data hooks (useProgress /
  // useProfile) remount cleanly and don't carry stale per-user state.
  const [authVersion, setAuthVersion] = useState(0)

  // Run auth check on mount + after each successful sign-in/out. We
  // distinguish two failure modes for `api.me()`:
  //   - ApiError (4xx/5xx with a real response): API is up, treat as
  //     signed-out so the user can log in or skip
  //   - other (network failure, CORS): API is down, auto-enter offline
  //     mode so the user isn't stuck on a loading screen
  useEffect(() => {
    setOfflineMode(false) // reset when this effect re-runs (sign-in/out)
    const ctrl = new AbortController()
    void (async () => {
      try {
        const me = await api.me(ctrl.signal)
        setAuthState(me.authenticated ? 'signed-in' : 'signed-out')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (err instanceof ApiError) {
          setAuthState('signed-out')
        } else {
          setOfflineMode(true)
          setAuthState('offline')
        }
      }
    })()
    return () => ctrl.abort()
  }, [authVersion])

  function handleContinueOffline() {
    setOfflineMode(true)
    setAuthState('offline')
  }

  function handleSignedIn() {
    setOfflineMode(false)
    setAuthState('signed-in')
  }

  function handleSignOut() {
    setOfflineMode(false)
    setAuthState('signed-out')
    setAuthVersion((v) => v + 1) // remount SignedInApp, drop user state
  }

  function handleSwitchToLogin() {
    // From offline mode, the user wants to authenticate. Bounce through
    // 'checking' so api.me() runs again — the API may have come back.
    setOfflineMode(false)
    setAuthState('checking')
    setAuthVersion((v) => v + 1)
  }

  if (authState === 'checking') {
    return <div className="auth-checking" />
  }
  if (authState === 'signed-out') {
    return (
      <LoginScreen
        onSignedIn={handleSignedIn}
        onContinueOffline={handleContinueOffline}
      />
    )
  }

  return (
    <SignedInApp
      offline={authState === 'offline'}
      onSignOut={handleSignOut}
      onSwitchToLogin={handleSwitchToLogin}
    />
  )
}

interface SignedInProps {
  offline: boolean
  onSignOut: () => void
  onSwitchToLogin: () => void
}

/**
 * The signed-in app is its own component so React unmounts every screen
 * (and resets the data hooks) cleanly when a user logs out. The hooks
 * here are scoped to the current authenticated user.
 *
 * In offline mode the same UI runs unchanged — the api client short-
 * circuits requests so the per-hook fallbacks (localStorage cache,
 * bundled JSON) drive everything. The `offline` prop is purely for the
 * profile/topbar affordances ("Sign in" instead of "Sign out", a small
 * indicator pill).
 */
function SignedInApp({ offline, onSignOut, onSwitchToLogin }: SignedInProps) {
  const [screen, setScreen] = useState<Screen>('language-select')
  const [tab, setTab] = useState<Tab>('home')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null)
  const [examTopic, setExamTopic] = useState<Topic | null>(null)
  const [examLevel, setExamLevel] = useState<Level | null>(null)
  const [practiceScope, setPracticeScope] = useState<PracticeScope | null>(null)
  const progress = useProgress()
  const profile = useProfile()
  const exams = useTopicExams()
  const levelExams = useLevelExams()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SELECTED_COURSE_KEY)
      if (stored && parseCourseId(stored)) {
        setCourseId(stored)
        setScreen('tabs')
        return
      }
      // Migrate v1 storage: { code: 'zh', ... } → 'zh-en'
      const legacy = localStorage.getItem(LEGACY_SELECTED_LANG_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy) as { code?: string }
        if (parsed?.code) {
          const migrated = `${parsed.code}-en`
          if (parseCourseId(migrated)) {
            localStorage.setItem(SELECTED_COURSE_KEY, migrated)
            localStorage.removeItem(LEGACY_SELECTED_LANG_KEY)
            setCourseId(migrated)
            setScreen('tabs')
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [])

  const activeCourseId = courseId ?? 'zh-en'
  const { levels } = useCourse(activeCourseId)
  const targetLang = findLanguage(parseCourseId(activeCourseId)?.target ?? 'zh') ?? null
  const mistakes = useMistakes(activeCourseId)

  function handleLanguageSelect(id: string) {
    setCourseId(id)
    try {
      localStorage.setItem(SELECTED_COURSE_KEY, id)
    } catch {
      /* ignore */
    }
    setTab('home')
    setScreen('tabs')
  }

  function handleLessonSelect(lesson: Lesson) {
    setActiveLesson(lesson)
    setScreen('lesson')
  }

  function handleOpenGuide(topic: Topic) {
    setActiveTopic(topic)
    setScreen('guide')
  }

  function handleTakeExam(topic: Topic) {
    setExamTopic(topic)
    setScreen('exam')
  }

  function handleTakeLevelExam(level: Level) {
    setExamLevel(level)
    setScreen('level-exam-intro')
  }

  function startPractice(scope: PracticeScope) {
    if (scope.ids.length === 0) return
    setPracticeScope(scope)
    setScreen('practice-mistakes')
  }

  function handlePracticeLesson(lesson: Lesson) {
    startPractice({
      label: lesson.title,
      ids: mistakesForLesson(lesson.id, mistakes.state),
    })
  }

  function handlePracticeTopic(topic: Topic) {
    startPractice({
      label: topic.title,
      ids: mistakesForTopic(topic.id, mistakes.state),
    })
  }

  function handlePracticeLevel(level: Level) {
    startPractice({
      label: level.name,
      ids: mistakesForLevel(level.id, mistakes.state),
    })
  }

  // Shared between LessonScreen and the exam wrappers — records a
  // mistake against the right lesson/topic/level by walking the course
  // for the failed exercise's home location.
  function recordMistake(exerciseId: string) {
    const found = locateExercise(levels, exerciseId)
    if (!found) return
    mistakes.record(exerciseId, {
      lessonId: found.lesson.id,
      topicId: found.topic.id,
      levelId: found.level.id,
    })
  }

  function handleLessonComplete(mistakes: number) {
    if (activeLesson) {
      progress.recordCompletion(activeLesson.id, mistakes, activeLesson.xp)
    }
    setScreen('tabs')
  }

  function handleSwitchLanguage() {
    try {
      localStorage.removeItem(SELECTED_COURSE_KEY)
      localStorage.removeItem(LEGACY_SELECTED_LANG_KEY)
    } catch {
      /* ignore */
    }
    setCourseId(null)
    setScreen('language-select')
  }

  async function handleSignOut() {
    if (!offline) {
      try {
        await api.logout()
      } catch {
        // Even if the API call fails, log out locally — better than
        // trapping the user on a broken connection.
      }
    }
    try {
      localStorage.removeItem(SELECTED_COURSE_KEY)
      localStorage.removeItem(LEGACY_SELECTED_LANG_KEY)
      localStorage.removeItem('mochilang:progress:v1')
      localStorage.removeItem('mochilang:profile:v1')
      localStorage.removeItem('mochilang:topicExams:v1')
      localStorage.removeItem('mochilang:levelExams:v1')
      localStorage.removeItem('mochilang:mistakes:v1')
    } catch {
      /* ignore */
    }
    onSignOut()
  }

  if (screen === 'language-select') {
    return (
      <LanguageSelectScreen
        initialCourseId={courseId}
        onSelect={handleLanguageSelect}
      />
    )
  }

  if (screen === 'settings') {
    return <SettingsScreen onBack={() => setScreen('tabs')} />
  }

  if (screen === 'lesson' && activeLesson) {
    return (
      <LessonScreen
        lesson={activeLesson}
        onComplete={handleLessonComplete}
        onBack={() => setScreen('tabs')}
        onWrongAnswer={recordMistake}
      />
    )
  }

  if (screen === 'guide' && activeTopic) {
    return (
      <TopicGuideScreen
        topic={activeTopic}
        onBack={() => setScreen('tabs')}
      />
    )
  }

  if (screen === 'exam' && examTopic) {
    return (
      <TopicExamScreen
        topic={examTopic}
        onPass={() => exams.pass(examTopic.id)}
        onBack={() => setScreen('tabs')}
        onWrongAnswer={recordMistake}
      />
    )
  }

  if (screen === 'level-exam-intro' && examLevel) {
    return (
      <LevelExamIntroScreen
        level={examLevel}
        onStart={() => setScreen('level-exam')}
        onCancel={() => setScreen('tabs')}
      />
    )
  }

  if (screen === 'level-exam' && examLevel) {
    return (
      <LevelExamScreen
        level={examLevel}
        onPass={() => levelExams.pass(examLevel.id)}
        onBack={() => setScreen('tabs')}
        onWrongAnswer={recordMistake}
      />
    )
  }

  if (screen === 'practice-mistakes' && practiceScope) {
    return (
      <PracticeMistakesScreen
        scopeLabel={practiceScope.label}
        exerciseIds={practiceScope.ids}
        levels={levels}
        onResolve={mistakes.resolve}
        onFail={(id, ctx) => mistakes.record(id, ctx)}
        onBack={() => setScreen('tabs')}
      />
    )
  }

  return (
    <>
      {tab === 'home' && (
        <HomeScreen
          levels={levels}
          progress={progress.state}
          examsPassed={exams.state}
          levelExamsPassed={levelExams.state}
          mistakes={mistakes.state}
          isCompleted={progress.isCompleted}
          onSelect={handleLessonSelect}
          onOpenGuide={handleOpenGuide}
          onTakeExam={handleTakeExam}
          onTakeLevelExam={handleTakeLevelExam}
          onPracticeLesson={handlePracticeLesson}
          onPracticeTopic={handlePracticeTopic}
          onPracticeLevel={handlePracticeLevel}
          onSwitchLanguage={handleSwitchLanguage}
          language={targetLang}
          offline={offline}
        />
      )}
      {tab === 'league' && (
        <LeagueScreen
          progress={progress.state}
          profile={profile.state}
          setProfile={profile.setProfile}
        />
      )}
      {tab === 'friends' && <FriendsScreen />}
      {tab === 'profile' && (
        <ProfileScreen
          progress={progress.state}
          profile={profile.state}
          setProfile={profile.setProfile}
          offline={offline}
          levels={levels}
          onSwitchLanguage={handleSwitchLanguage}
          onOpenSettings={() => setScreen('settings')}
          onResetProgress={() => {
            void progress.reset()
            exams.reset()
            levelExams.reset()
            mistakes.resetCourse()
          }}
          onResetProfile={profile.reset}
          onSignOut={handleSignOut}
          onSwitchToLogin={onSwitchToLogin}
          onStartLesson={handleLessonSelect}
        />
      )}

      <BottomNav active={tab} onChange={setTab} />

      {profile.state.name === null && (
        <ProfileSetup
          onSubmit={(name, avatarId) => profile.setProfile({ name, avatarId })}
        />
      )}
    </>
  )
}
