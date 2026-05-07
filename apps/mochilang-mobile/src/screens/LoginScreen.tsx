import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { setOfflineMode } from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  onContinueOffline: () => void
}

/**
 * RN LoginScreen — Phase 1 ships offline-only.
 *
 * Google sign-in requires `expo-auth-session` and a different OAuth
 * flow than the web's GIS button; that lands in Phase 2. For now the
 * primary action is "Continue without an account" so the user can
 * actually exercise the app on a phone.
 */
export default function LoginScreen({ onContinueOffline }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.shell}>
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
            label="Continue without an account"
            tone="primary"
            size="lg"
            onPress={() => {
              setOfflineMode(true)
              onContinueOffline()
            }}
          />
        </View>

        <Text style={styles.fineprint}>
          Google sign-in is coming in Phase 2. For now your progress lives on
          this device only.
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
