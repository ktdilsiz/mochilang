import 'react-native-gesture-handler'
import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View } from 'react-native'
import { configureApiBaseUrl, setOfflineMode, type Lesson } from '@mochilang/shared'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import LessonScreen from './src/screens/LessonScreen'
import StubScreen from './src/screens/StubScreen'
import { useProgress } from './src/state/useProgress'
import { colors } from './src/lib/theme'

// Wire the API base URL from Expo config so the shared client can run
// in either app. The wrapper's app.json `extra.apiUrl` overrides; the
// fallback assumes the API is on the same machine that's running
// Expo Go (only useful for the Expo Go web preview).
configureApiBaseUrl(
  ((Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl) ??
    'http://localhost:8181'
)

type RootStackParamList = {
  Tabs: undefined
  Lesson: { lesson: Lesson }
}

type TabParamList = {
  Home: undefined
  League: undefined
  Friends: undefined
  Profile: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<TabParamList>()

export default function App() {
  // Phase 1: skip the auth flow entirely on first mount, drop into
  // offline mode, show the LoginScreen briefly, then advance. Phase 2
  // will wire api.me() + Google sign-in.
  const [signedIn, setSignedIn] = useState(false)

  if (!signedIn) {
    return (
      <>
        <StatusBar style="auto" />
        <LoginScreen onContinueOffline={() => setSignedIn(true)} />
      </>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={SignedInTabs} />
        <Stack.Screen
          name="Lesson"
          component={LessonScreenWrapper}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

function SignedInTabs() {
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
              props.navigation.getParent()?.navigate('Lesson', { lesson })
            }
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="League" options={{ tabBarIcon: tabIcon('🛡') }}>
        {() => (
          <StubScreen
            title="League"
            emoji="🛡"
            body="Weekly leaderboard with bot competitors. Phase 2 brings the full ranked board with promote/demote zones."
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Friends" options={{ tabBarIcon: tabIcon('👥') }}>
        {() => (
          <StubScreen
            title="Friends"
            emoji="👥"
            body="Your friend roster with weekly XP sparklines. Phase 2."
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Profile" options={{ tabBarIcon: tabIcon('👤') }}>
        {() => <ProfileStub />}
      </Tabs.Screen>
    </Tabs.Navigator>
  )
}

function ProfileStub() {
  const progress = useProgress()
  return (
    <StubScreen
      title="Profile"
      emoji="👤"
      body={`Stats are working: ${progress.state.totalXp} XP, ${progress.state.streak}-day streak. The full Profile screen with avatar selection, settings, and the spaced-review modal lands in Phase 2.`}
    />
  )
}

function LessonScreenWrapper(props: {
  route: { params: { lesson: Lesson } }
  navigation: { goBack: () => void }
}) {
  const progress = useProgress()
  const lesson = props.route.params.lesson
  return (
    <LessonScreen
      lesson={lesson}
      onComplete={(mistakes) => {
        void progress.recordCompletion(lesson.id, mistakes, lesson.xp)
        props.navigation.goBack()
      }}
      onBack={() => props.navigation.goBack()}
    />
  )
}

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <View>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
    </View>
  )
}

// Wire the offline mode flag at module load so the Phase 1 offline-only
// flow doesn't accidentally hit a non-existent API.
setOfflineMode(true)
