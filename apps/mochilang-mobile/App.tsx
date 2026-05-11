import 'react-native-gesture-handler'
import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'
import { NavigationContainer } from '@react-navigation/native'
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, ActivityIndicator } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito'
import {
  configureApiBaseUrl,
  parseCourseId,
  setOfflineMode,
  type Lesson,
  type Level,
  type Topic,
} from '@mochilang/shared'
import AsyncStorage from '@react-native-async-storage/async-storage'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import LessonScreen from './src/screens/LessonScreen'
import SocialScreen from './src/screens/SocialScreen'
import VillageScreen from './src/screens/VillageScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import TopicGuideScreen from './src/screens/TopicGuideScreen'
import LanguageSelectScreen from './src/screens/LanguageSelectScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import TopicExamScreen from './src/screens/TopicExamScreen'
import LevelExamScreen from './src/screens/LevelExamScreen'
import LevelExamIntroScreen from './src/screens/LevelExamIntroScreen'
import PracticeMistakesScreen from './src/screens/PracticeMistakesScreen'
import ProfileSetup from './src/components/ProfileSetup'
import { useProgress } from './src/state/useProgress'
import { useProfile } from './src/state/useProfile'
import { useCourse } from './src/state/useCourse'
import { useTopicExams } from './src/state/useTopicExams'
import { useLevelExams } from './src/state/useLevelExams'
import { useMistakes } from './src/state/useMistakes'
import {
  locateExercise,
  mistakesForLesson,
  mistakesForLevel,
  mistakesForTopic,
} from '@mochilang/shared'
import { colors } from './src/lib/theme'

const SELECTED_COURSE_KEY = 'mochilang:selectedCourse'
const DEFAULT_COURSE_ID = 'zh-en'

// API base URL — Expo Constants extra. Override in app.json for LAN/prod.
configureApiBaseUrl(
  ((Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl) ??
    'http://localhost:8181'
)

// Phase 2 still ships offline-mode by default. Google sign-in (with
// expo-auth-session) lands in Phase 3.
setOfflineMode(true)

type RootStackParamList = {
  LanguageSelect: { initialCourseId: string | null; allowCancel: boolean }
  Tabs: undefined
  Lesson: { lesson: Lesson }
  Guide: { topic: Topic }
  Settings: undefined
  Exam: { topic: Topic }
  LevelExamIntro: { level: Level }
  LevelExam: { level: Level }
  PracticeMistakes: { label: string; ids: string[] }
}

// Convenience alias used at the tab leaves to navigate the parent stack.
type RootNav = NativeStackScreenProps<RootStackParamList>['navigation']

type TabParamList = {
  Home: undefined
  Village: undefined
  Social: undefined
  Profile: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<TabParamList>()

// Patch Text + TextInput so every node downstream uses Nunito by default.
// React Native has no global font-family; this is the standard escape
// hatch and is applied once at module load. We pair it with weight-aware
// renderers in style maps below.
import { TextInput } from 'react-native'

// React Native's Text and TextInput accept arrays of style objects,
// so the assignable type is broader than a single style record.
interface DefaultProps {
  defaultProps?: { style?: unknown }
}

const TextWithDefaults = Text as unknown as DefaultProps
const InputWithDefaults = TextInput as unknown as DefaultProps
TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {}
TextWithDefaults.defaultProps.style = [
  { fontFamily: 'Nunito_700Bold' },
  TextWithDefaults.defaultProps.style,
]
InputWithDefaults.defaultProps = InputWithDefaults.defaultProps ?? {}
InputWithDefaults.defaultProps.style = [
  { fontFamily: 'Nunito_700Bold' },
  InputWithDefaults.defaultProps.style,
]

export default function App() {
  const [signedIn, setSignedIn] = useState(false)
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbf2' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  // SafeAreaProvider has to wrap everything that calls useSafeAreaInsets,
  // including LoginScreen — without it iOS notch padding lookups return
  // zeros and the top of the screen sits under the status bar.
  return (
    <SafeAreaProvider>
      {!signedIn ? (
        <>
          <StatusBar style="auto" />
          <LoginScreen onContinueOffline={() => setSignedIn(true)} />
        </>
      ) : (
        <SignedInApp onSignOut={() => setSignedIn(false)} />
      )}
    </SafeAreaProvider>
  )
}

interface SignedInAppProps {
  onSignOut: () => void
}

function SignedInApp({ onSignOut }: SignedInAppProps) {
  const progress = useProgress()
  const profile = useProfile()
  const exams = useTopicExams()
  const levelExams = useLevelExams()
  const [courseId, setCourseId] = useState<string | null>(null)
  // Hook is created at the App level so it's stable across navigations,
  // but it scopes by courseId so changing courses gives a fresh deck.
  const mistakes = useMistakes(courseId ?? DEFAULT_COURSE_ID)
  // null while we read AsyncStorage; once known we either render the
  // picker (no stored course) or the tabs (have a course).
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(SELECTED_COURSE_KEY)
        if (stored && parseCourseId(stored)) {
          setCourseId(stored)
        }
      } catch {
        /* ignore */
      } finally {
        setHydrated(true)
      }
    })()
  }, [])

  const course = useCourse(courseId ?? DEFAULT_COURSE_ID)

  // First-launch profile setup overlay — same trigger as web. Stays
  // mounted on top of the navigator until the user has picked a name.
  const showSetup = profile.state.name === null

  function handleSelectCourse(id: string) {
    setCourseId(id)
    void AsyncStorage.setItem(SELECTED_COURSE_KEY, id).catch(() => {})
  }

  // Look up a failed exercise's lesson/topic/level, then record a
  // mistake. Shared between LessonScreen and the exam screens — both
  // forward their per-question wrong-answer events here.
  function recordMistake(exerciseId: string) {
    const found = locateExercise(course.levels, exerciseId)
    if (!found) return
    mistakes.record(exerciseId, {
      lessonId: found.lesson.id,
      topicId: found.topic.id,
      levelId: found.level.id,
    })
  }

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={courseId ? 'Tabs' : 'LanguageSelect'}
      >
        <Stack.Screen
          name="LanguageSelect"
          initialParams={{ initialCourseId: courseId, allowCancel: false }}
        >
          {(props) => (
            <LanguageSelectScreen
              initialCourseId={props.route.params?.initialCourseId ?? courseId}
              onSelect={(id) => {
                handleSelectCourse(id)
                props.navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] })
              }}
              onCancel={
                props.route.params?.allowCancel
                  ? () => props.navigation.goBack()
                  : undefined
              }
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Tabs">
          {(props) => (
            <SignedInTabs
              progress={progress}
              profile={profile}
              course={course}
              courseId={courseId ?? DEFAULT_COURSE_ID}
              exams={exams}
              levelExams={levelExams}
              mistakes={mistakes}
              onSignOut={onSignOut}
              onSwitchLanguage={() =>
                props.navigation.navigate('LanguageSelect', {
                  initialCourseId: courseId,
                  allowCancel: true,
                })
              }
              onOpenSettings={() => props.navigation.navigate('Settings')}
              onTakeExam={(topic) => props.navigation.navigate('Exam', { topic })}
              onTakeLevelExam={(level) =>
                props.navigation.navigate('LevelExamIntro', { level })
              }
              onPracticeLesson={(lesson) => {
                const ids = mistakesForLesson(lesson.id, mistakes.state)
                if (ids.length === 0) return
                props.navigation.navigate('PracticeMistakes', {
                  label: lesson.title,
                  ids,
                })
              }}
              onPracticeTopic={(topic) => {
                const ids = mistakesForTopic(topic.id, mistakes.state)
                if (ids.length === 0) return
                props.navigation.navigate('PracticeMistakes', {
                  label: topic.title,
                  ids,
                })
              }}
              onPracticeLevel={(level) => {
                const ids = mistakesForLevel(level.id, mistakes.state)
                if (ids.length === 0) return
                props.navigation.navigate('PracticeMistakes', {
                  label: level.name,
                  ids,
                })
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Lesson" options={{ presentation: 'modal' }}>
          {(props) => (
            <LessonRoute
              progress={progress}
              recordMistake={recordMistake}
              courseId={courseId ?? DEFAULT_COURSE_ID}
              {...props}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Guide" options={{ presentation: 'modal' }}>
          {(props) => <GuideRoute {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {(props) => <SettingsScreen onBack={() => props.navigation.goBack()} />}
        </Stack.Screen>
        <Stack.Screen name="Exam" options={{ presentation: 'modal' }}>
          {(props) => (
            <TopicExamScreen
              topic={props.route.params.topic}
              onPass={() => exams.pass(props.route.params.topic.id)}
              onBack={() => props.navigation.goBack()}
              onWrongAnswer={recordMistake}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="LevelExamIntro"
          options={{ presentation: 'modal' }}
        >
          {(props) => (
            <LevelExamIntroScreen
              level={props.route.params.level}
              onStart={() =>
                props.navigation.replace('LevelExam', {
                  level: props.route.params.level,
                })
              }
              onCancel={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="LevelExam" options={{ presentation: 'modal' }}>
          {(props) => (
            <LevelExamScreen
              level={props.route.params.level}
              onPass={() => levelExams.pass(props.route.params.level.id)}
              onBack={() => props.navigation.goBack()}
              onWrongAnswer={recordMistake}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="PracticeMistakes"
          options={{ presentation: 'modal' }}
        >
          {(props) => (
            <PracticeMistakesScreen
              scopeLabel={props.route.params.label}
              exerciseIds={props.route.params.ids}
              levels={course.levels}
              onResolve={mistakes.resolve}
              onFail={(id, ctx) => mistakes.record(id, ctx)}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>

      {showSetup && (
        <ProfileSetup
          onSubmit={(name, avatarId) => profile.setProfile({ name, avatarId })}
        />
      )}
    </NavigationContainer>
  )
}

interface SignedInTabsProps {
  progress: ReturnType<typeof useProgress>
  profile: ReturnType<typeof useProfile>
  course: ReturnType<typeof useCourse>
  courseId: string
  exams: ReturnType<typeof useTopicExams>
  levelExams: ReturnType<typeof useLevelExams>
  mistakes: ReturnType<typeof useMistakes>
  onSignOut: () => void
  onSwitchLanguage: () => void
  onOpenSettings: () => void
  onTakeExam: (topic: Topic) => void
  onTakeLevelExam: (level: Level) => void
  onPracticeLesson: (lesson: Lesson) => void
  onPracticeTopic: (topic: Topic) => void
  onPracticeLevel: (level: Level) => void
}

function SignedInTabs({
  progress,
  profile,
  course,
  courseId,
  exams,
  levelExams,
  mistakes,
  onSignOut,
  onSwitchLanguage,
  onOpenSettings,
  onTakeExam,
  onTakeLevelExam,
  onPracticeLesson,
  onPracticeTopic,
  onPracticeLevel,
}: SignedInTabsProps) {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary700,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{ tabBarLabel: 'Learn', tabBarIcon: tabIcon('🏠') }}
      >
        {(props) => (
          <HomeScreen
            courseId={courseId}
            examsPassed={exams.state}
            levelExamsPassed={levelExams.state}
            mistakes={mistakes.state}
            onSelectLesson={(lesson) =>
              (props.navigation.getParent() as RootNav | undefined)?.navigate('Lesson', { lesson })
            }
            onOpenGuide={(topic) =>
              (props.navigation.getParent() as RootNav | undefined)?.navigate(
                'Guide',
                { topic }
              )
            }
            onTakeExam={onTakeExam}
            onTakeLevelExam={onTakeLevelExam}
            onPracticeLesson={onPracticeLesson}
            onPracticeTopic={onPracticeTopic}
            onPracticeLevel={onPracticeLevel}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="Village"
        options={{ tabBarLabel: 'Village', tabBarIcon: tabIcon('🏡') }}
      >
        {() => <VillageScreen courseId={courseId} />}
      </Tabs.Screen>
      <Tabs.Screen
        name="Social"
        options={{ tabBarLabel: 'Social', tabBarIcon: tabIcon('🏆') }}
      >
        {() => (
          <SocialScreen
            progress={progress.state}
            profile={profile.state}
            setProfile={profile.setProfile}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="Profile"
        options={{ tabBarLabel: 'Profile', tabBarIcon: tabIcon('👤') }}
      >
        {(props) => (
          <ProfileScreen
            progress={progress.state}
            profile={profile.state}
            setProfile={profile.setProfile}
            offline={true /* Phase 2 stays offline-only */}
            levels={course.levels}
            onSwitchLanguage={onSwitchLanguage}
            onOpenSettings={onOpenSettings}
            onResetProgress={() => {
              void progress.reset()
              exams.reset()
              levelExams.reset()
              mistakes.resetCourse()
            }}
            onResetProfile={() => void profile.reset()}
            onSignOut={onSignOut}
            onSwitchToLogin={onSignOut}
            onStartLesson={(lesson) =>
              (props.navigation.getParent() as RootNav | undefined)?.navigate('Lesson', { lesson })
            }
          />
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  )
}

function LessonRoute({
  route,
  navigation,
  progress,
  recordMistake,
  courseId,
}: NativeStackScreenProps<RootStackParamList, 'Lesson'> & {
  progress: ReturnType<typeof useProgress>
  recordMistake: (exerciseId: string) => void
  courseId: string
}) {
  const lesson = route.params.lesson
  return (
    <LessonScreen
      lesson={lesson}
      courseId={courseId}
      onComplete={(mistakes) => {
        void progress.recordCompletion(lesson.id, mistakes, lesson.xp)
        navigation.goBack()
      }}
      onBack={() => navigation.goBack()}
      onWrongAnswer={recordMistake}
    />
  )
}

function GuideRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Guide'>) {
  return (
    <TopicGuideScreen topic={route.params.topic} onBack={() => navigation.goBack()} />
  )
}

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <View>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
    </View>
  )
}
