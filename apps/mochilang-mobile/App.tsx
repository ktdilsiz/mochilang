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
import { Text, View } from 'react-native'
import {
  configureApiBaseUrl,
  setOfflineMode,
  type Lesson,
  type Topic,
} from '@mochilang/shared'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import LessonScreen from './src/screens/LessonScreen'
import LeagueScreen from './src/screens/LeagueScreen'
import FriendsScreen from './src/screens/FriendsScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import TopicGuideScreen from './src/screens/TopicGuideScreen'
import ProfileSetup from './src/components/ProfileSetup'
import { useProgress } from './src/state/useProgress'
import { useProfile } from './src/state/useProfile'
import { useCourse } from './src/state/useCourse'
import { colors } from './src/lib/theme'

// API base URL — Expo Constants extra. Override in app.json for LAN/prod.
configureApiBaseUrl(
  ((Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl) ??
    'http://localhost:8181'
)

// Phase 2 still ships offline-mode by default. Google sign-in (with
// expo-auth-session) lands in Phase 3.
setOfflineMode(true)

type RootStackParamList = {
  Tabs: undefined
  Lesson: { lesson: Lesson }
  Guide: { topic: Topic }
}

// Convenience alias used at the tab leaves to navigate the parent stack.
type RootNav = NativeStackScreenProps<RootStackParamList>['navigation']

type TabParamList = {
  Home: undefined
  League: undefined
  Friends: undefined
  Profile: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<TabParamList>()

export default function App() {
  const [signedIn, setSignedIn] = useState(false)

  if (!signedIn) {
    return (
      <>
        <StatusBar style="auto" />
        <LoginScreen onContinueOffline={() => setSignedIn(true)} />
      </>
    )
  }

  return <SignedInApp onSignOut={() => setSignedIn(false)} />
}

interface SignedInAppProps {
  onSignOut: () => void
}

function SignedInApp({ onSignOut }: SignedInAppProps) {
  const progress = useProgress()
  const profile = useProfile()
  const course = useCourse('zh-en')

  // First-launch profile setup overlay — same trigger as web. Stays
  // mounted on top of the navigator until the user has picked a name.
  const showSetup = profile.state.name === null

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs">
          {() => (
            <SignedInTabs
              progress={progress}
              profile={profile}
              course={course}
              onSignOut={onSignOut}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Lesson"
          options={{ presentation: 'modal' }}
        >
          {(props) => <LessonRoute progress={progress} {...props} />}
        </Stack.Screen>
        <Stack.Screen
          name="Guide"
          options={{ presentation: 'modal' }}
        >
          {(props) => <GuideRoute {...props} />}
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
  onSignOut: () => void
}

function SignedInTabs({ progress, profile, course, onSignOut }: SignedInTabsProps) {
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
            onSelectLesson={(lesson) =>
              (props.navigation.getParent() as RootNav | undefined)?.navigate('Lesson', { lesson })
            }
            onOpenGuide={(topic) =>
              (props.navigation.getParent() as RootNav | undefined)?.navigate(
                'Guide',
                { topic }
              )
            }
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="League"
        options={{ tabBarLabel: 'League', tabBarIcon: tabIcon('🛡') }}
      >
        {() => (
          <LeagueScreen
            progress={progress.state}
            profile={profile.state}
            setProfile={profile.setProfile}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="Friends"
        options={{ tabBarLabel: 'Friends', tabBarIcon: tabIcon('👥') }}
      >
        {() => <FriendsScreen />}
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
            onSwitchLanguage={onSignOut /* repurposed — Phase 3 will add a real picker */}
            onResetProgress={() => void progress.reset()}
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
}: NativeStackScreenProps<RootStackParamList, 'Lesson'> & {
  progress: ReturnType<typeof useProgress>
}) {
  const lesson = route.params.lesson
  return (
    <LessonScreen
      lesson={lesson}
      onComplete={(mistakes) => {
        void progress.recordCompletion(lesson.id, mistakes, lesson.xp)
        navigation.goBack()
      }}
      onBack={() => navigation.goBack()}
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
