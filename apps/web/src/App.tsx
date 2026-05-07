import { useEffect, useState } from 'react'
import type { Lesson, Language, Topic } from './types'
import { useCourse } from './data/lessons'
import LanguageSelectScreen from './screens/LanguageSelectScreen'
import LoginScreen from './screens/LoginScreen'
import HomeScreen from './screens/HomeScreen'
import LessonScreen from './screens/LessonScreen'
import LeagueScreen from './screens/LeagueScreen'
import FriendsScreen from './screens/FriendsScreen'
import ProfileScreen from './screens/ProfileScreen'
import TopicGuideScreen from './screens/TopicGuideScreen'
import BottomNav, { type Tab } from './components/BottomNav'
import ProfileSetup from './components/ProfileSetup'
import { useProgress } from './state'
import { useProfile } from './profile'
import { api, ApiError, setOfflineMode } from './lib/api'

/**
 * Auth states:
 *   - checking   : initial /api/auth/me in flight
 *   - signed-out : API reachable, no session — show LoginScreen
 *   - signed-in  : authenticated, full API mode
 *   - offline    : explicitly skipped login OR API unreachable; localStorage only
 */
type AuthState = 'checking' | 'signed-out' | 'signed-in' | 'offline'
type Screen = 'language-select' | 'tabs' | 'lesson' | 'guide'

const SELECTED_LANG_KEY = 'mochilang:selectedLanguage'

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('checking')
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
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null)
  const progress = useProgress()
  const profile = useProfile()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SELECTED_LANG_KEY)
      if (raw) {
        const lang = JSON.parse(raw) as Language
        setSelectedLanguage(lang)
        setScreen('tabs')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const courseId = selectedLanguage ? `${selectedLanguage.code}-en` : 'zh-en'
  const { levels } = useCourse(courseId)

  function handleLanguageSelect(lang: Language) {
    setSelectedLanguage(lang)
    try {
      localStorage.setItem(SELECTED_LANG_KEY, JSON.stringify(lang))
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

  function handleLessonComplete(mistakes: number) {
    if (activeLesson) {
      progress.recordCompletion(activeLesson.id, mistakes, activeLesson.xp)
    }
    setScreen('tabs')
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
      localStorage.removeItem(SELECTED_LANG_KEY)
      localStorage.removeItem('mochilang:progress:v1')
      localStorage.removeItem('mochilang:profile:v1')
    } catch {
      /* ignore */
    }
    onSignOut()
  }

  if (screen === 'language-select') {
    return <LanguageSelectScreen onSelect={handleLanguageSelect} />
  }

  if (screen === 'lesson' && activeLesson) {
    return (
      <LessonScreen
        lesson={activeLesson}
        onComplete={handleLessonComplete}
        onBack={() => setScreen('tabs')}
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

  return (
    <>
      {tab === 'home' && (
        <HomeScreen
          levels={levels}
          progress={progress.state}
          isCompleted={progress.isCompleted}
          onSelect={handleLessonSelect}
          onOpenGuide={handleOpenGuide}
          onSwitchLanguage={handleSwitchLanguage}
          language={selectedLanguage}
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
          onResetProgress={progress.reset}
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
