import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { setOfflineMode } from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  onContinueOffline: () => void
}

/**
 * Welcome screen for the offline-only release. No account, no sign-in —
 * everything is local to the device. The screen + the Google OAuth code
 * paths in the API client stay shipped so re-enabling auth later doesn't
 * need new code; the UI just hides the option for now.
 */
export default function LoginScreen({ onContinueOffline }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      contentContainerStyle={[
        styles.shell,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <View style={styles.card}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.hero}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome to Mochilang</Text>
        <Text style={styles.tagline}>
          Bite-sized lessons, cute mascot, friendly competition.
        </Text>

        <View style={styles.cta}>
          <LedgeButton
            label="Start learning"
            tone="primary"
            size="lg"
            onPress={() => {
              setOfflineMode(true)
              onContinueOffline()
            }}
          />
        </View>

        <Text style={styles.fineprint}>
          Your progress is saved on this device.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  shell: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: colors.cream100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
  },
  hero: {
    width: 140,
    height: 140,
    marginBottom: space.xs,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  cta: {
    width: '100%',
    marginTop: space.md,
  },
  fineprint: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: space.sm,
    maxWidth: 320,
  },
})
