import { useState } from 'react'
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import LedgeButton from './LedgeButton'
import { AVATAR_OPTIONS } from '../data/avatars'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  onSubmit: (name: string, avatarId: string) => void
}

/**
 * First-launch onboarding: pick a display name + Mochi avatar.
 *
 * Rendered as a fullscreen Modal so the rest of the app stays mounted
 * underneath. Keeps visual parity with the web `.profile-edit-modal`
 * card — same title, subtitle, name input, 5-column avatar grid, and
 * a primary "Let's go" button at the bottom.
 */
export default function ProfileSetup({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0].id)
  const trimmed = name.trim()

  return (
    <Modal visible animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Mochilang!</Text>
          <Text style={styles.subtitle}>
            Pick a name and a Mochi to compete in the league.
          </Text>

          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={name}
            maxLength={30}
            autoFocus
            placeholder="e.g. Mochi fan"
            placeholderTextColor={colors.textSubtle}
            onChangeText={setName}
          />

          <Text style={styles.label}>Pick a Mochi</Text>
          <View style={styles.avatars}>
            {AVATAR_OPTIONS.map((opt) => {
              const active = opt.id === avatarId
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setAvatarId(opt.id)}
                  accessibilityLabel={opt.label}
                  style={[styles.avatarPick, active && styles.avatarPickActive]}
                >
                  <Image source={opt.src} style={styles.avatarImg} resizeMode="contain" />
                </Pressable>
              )
            })}
          </View>

          <View style={styles.submitWrap}>
            <LedgeButton
              label="Let's go"
              tone="primary"
              size="lg"
              disabled={trimmed.length === 0}
              onPress={() => onSubmit(trimmed, avatarId)}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58, 37, 22, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 22,
    gap: space.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  avatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  avatarPick: {
    flexBasis: '18%',
    flexGrow: 1,
    aspectRatio: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: radius.md,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPickActive: {
    borderColor: colors.primary500,
    backgroundColor: colors.cream100,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  submitWrap: {
    marginTop: space.sm,
  },
})
