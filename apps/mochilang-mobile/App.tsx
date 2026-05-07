import Constants from 'expo-constants'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { WebView } from 'react-native-webview'

/**
 * Single-screen Expo wrapper around the mochilang web app.
 *
 * The web app at apps/web does the entire UI; this project just embeds
 * it in a native WebView so it shows up in Expo Go and (eventually) on
 * the App Store. The URL comes from app.json's `extra.webUrl` — point
 * it at your laptop's vite dev server when developing on LAN, swap to
 * the hosted URL once you deploy.
 *
 * Cookies and inline media playback are enabled so the web app's
 * Google Sign-In session and TTS playback both behave normally.
 */
export default function App() {
  const url =
    (Constants.expoConfig?.extra as { webUrl?: string })?.webUrl ??
    'http://localhost:5175'

  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        source={{ uri: url }}
        style={styles.web}
        onLoadStart={() => {
          setLoading(true)
          setErrMsg(null)
        }}
        onLoadEnd={() => setLoading(false)}
        onError={(e) =>
          setErrMsg(
            e.nativeEvent?.description ?? 'Failed to load — check the URL'
          )
        }
        // Keep cookies so /api/auth/* sessions survive across visits.
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        // Allow the web app's TTS / sound effects to play without a tap.
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // The mochilang topbar handles its own scroll; keep system
        // bounce scrolling off so it doesn't fight the in-app scroll.
        bounces={false}
        // Useful logging when something goes wrong on a real device.
        originWhitelist={['*']}
      />

      {loading && !errMsg && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" />
        </View>
      )}

      {errMsg && (
        <View style={styles.errBox}>
          <Text style={styles.errTitle}>Couldn't reach Mochilang</Text>
          <Text style={styles.errBody}>
            {errMsg}
            {'\n\n'}Tried: <Text style={styles.url}>{url}</Text>
            {'\n\n'}Edit{' '}
            <Text style={styles.code}>extra.webUrl</Text> in{' '}
            <Text style={styles.code}>app.json</Text> and reload.
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffbf2',
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fffbf2',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 48,
  },
  errTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3a2516',
    marginBottom: 12,
  },
  errBody: {
    fontSize: 15,
    color: '#6b4226',
    lineHeight: 22,
  },
  url: {
    fontWeight: '700',
    color: '#d3502a',
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#fff4dd',
    paddingHorizontal: 4,
    color: '#3a2516',
  },
})
