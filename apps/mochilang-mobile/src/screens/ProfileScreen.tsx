import { useMemo, useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type {
  Lesson,
  Level,
  ProfileState,
  ProgressState,
} from '@mochilang/shared'
import { pickReviewSuggestions, tierAt } from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import { AVATAR_OPTIONS, avatarById } from '../data/avatars'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  progress: ProgressState
  profile: ProfileState
  setProfile: (patch: Partial<ProfileState>) => void
  offline: boolean
  /** Course content — used to resolve lesson ids back to lesson objects for review. */
  levels: Level[]
  onSwitchLanguage: () => void
  onOpenSettings: () => void
  onResetProgress: () => void
  onResetProfile: () => void
  onSignOut: () => void
  onSwitchToLogin: () => void
  onStartLesson: (lesson: Lesson) => void
}

/**
 * RN port of apps/web/src/screens/ProfileScreen.tsx. Layout:
 * header card → 2x2 stats → Practice → Settings → About, plus two
 * full-screen Modals for the edit form and the review suggestions.
 *
 * Confirms use Alert.alert (web uses confirm()). Theme tokens drive
 * spacing/colors so the screen tracks the rest of the app.
 */
export default function ProfileScreen({
  progress,
  profile,
  setProfile,
  offline,
  levels,
  onSwitchLanguage,
  onOpenSettings,
  onResetProgress,
  onResetProfile,
  onSignOut,
  onSwitchToLogin,
  onStartLesson,
}: Props) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const reviewSuggestions = useMemo(
    () => pickReviewSuggestions(levels, progress.results),
    [levels, progress.results]
  )
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name ?? '')
  const [avatarId, setAvatarId] = useState(profile.avatarId)

  const stats = useMemo(() => {
    const lessons = Object.values(progress.results)
    const perfect = lessons.filter((r) => r.bestMistakes === 0).length
    return {
      completed: lessons.length,
      perfect,
      totalXp: progress.totalXp,
      streak: progress.streak,
    }
  }, [progress])

  const tier = tierAt(profile.leagueTier)
  const avatar = avatarById(profile.avatarId)

  function save() {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    setProfile({ name: trimmed, avatarId })
    setEditing(false)
  }

  function confirmResetProgress() {
    Alert.alert(
      'Reset progress?',
      'Reset your XP, streak and lesson progress? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onResetProgress },
      ]
    )
  }

  function confirmResetProfile() {
    Alert.alert(
      'Reset profile?',
      'Reset your name, avatar, and league tier? Your XP stays.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onResetProfile },
      ]
    )
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'Sign out of Mochilang?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onSignOut },
    ])
  }

  return (
    <ScrollView contentContainerStyle={styles.shell}>
      {/* Header card */}
      <View style={styles.headCard}>
        <Image source={avatar.src} style={styles.headAvatar} resizeMode="contain" />
        <View style={styles.headIdentity}>
          <Text style={styles.headName} numberOfLines={1}>
            {profile.name ?? 'Mochi friend'}
          </Text>
          <View style={styles.tierRow}>
            <View
              style={[
                styles.tierPill,
                { backgroundColor: tier.color, borderColor: tier.edge },
              ]}
            >
              <Text style={styles.tierPillText}>
                {tier.emoji} {tier.name}
              </Text>
            </View>
            {offline && (
              <View style={styles.offlinePill}>
                <Text style={styles.offlinePillText}>Offline</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.editBtnWrap}>
          <LedgeButton
            label="Edit"
            tone="neutral"
            onPress={() => {
              setName(profile.name ?? '')
              setAvatarId(profile.avatarId)
              setEditing(true)
            }}
          />
        </View>
      </View>

      {/* Stats grid (2x2 on mobile) */}
      <View style={styles.statsGrid}>
        <Stat label="Total XP" value={stats.totalXp.toLocaleString()} accent="xp" />
        <Stat label="Day streak" value={String(stats.streak)} accent="primary" />
        <Stat label="Lessons" value={String(stats.completed)} />
        <Stat label="Perfect runs" value={String(stats.perfect)} accent="success" />
      </View>

      {/* Practice */}
      <View style={styles.section}>
        <Text style={styles.sectionHead}>Practice</Text>
        <View style={styles.actionsCol}>
          <ActionButton
            label={
              reviewSuggestions.length > 0
                ? `Review older lessons  (${reviewSuggestions.length})`
                : 'Review older lessons'
            }
            tone="primary"
            disabled={reviewSuggestions.length === 0}
            onPress={() => setReviewOpen(true)}
          />
        </View>
        {reviewSuggestions.length === 0 && (
          <Text style={styles.actionHint}>
            Lessons you finish will appear here a week later for spaced
            review.
          </Text>
        )}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionHead}>Settings</Text>
        <View style={styles.actionsCol}>
          <ActionButton
            label="App settings"
            tone="neutral"
            onPress={onOpenSettings}
          />
          <ActionButton
            label="Switch course language"
            tone="neutral"
            onPress={onSwitchLanguage}
          />
          <ActionButton
            label="Reset progress"
            tone="neutral"
            onPress={confirmResetProgress}
          />
          <ActionButton
            label="Reset profile"
            tone="neutral"
            onPress={confirmResetProfile}
          />
          {offline ? (
            <ActionButton
              label="Sign in with Google"
              tone="primary"
              onPress={onSwitchToLogin}
            />
          ) : (
            <ActionButton label="Sign out" tone="neutral" onPress={confirmSignOut} />
          )}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionHead}>About</Text>
        <Text style={styles.about}>
          Mochilang is a side project — friends and competitors are simulated
          for now. Real social features land later.
        </Text>
      </View>

      {/* Edit modal */}
      <Modal
        visible={editing}
        animationType="fade"
        transparent
        onRequestClose={() => setEditing(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setEditing(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Your profile</Text>
            <Text style={styles.modalLabel}>Display name</Text>
            <TextInput
              style={styles.modalInput}
              value={name}
              maxLength={30}
              onChangeText={setName}
              placeholderTextColor={colors.textSubtle}
            />
            <Text style={styles.modalLabel}>Pick a Mochi</Text>
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
                    <Image
                      source={opt.src}
                      style={styles.avatarImg}
                      resizeMode="contain"
                    />
                  </Pressable>
                )
              })}
            </View>
            <View style={styles.modalButtons}>
              <View style={styles.modalBtn}>
                <LedgeButton
                  label="Cancel"
                  tone="ghost"
                  onPress={() => setEditing(false)}
                />
              </View>
              <View style={styles.modalBtn}>
                <LedgeButton
                  label="Save"
                  tone="primary"
                  disabled={name.trim().length === 0}
                  onPress={save}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Review modal */}
      <Modal
        visible={reviewOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setReviewOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setReviewOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Brush up on these</Text>
            <Text style={styles.actionHint}>
              Lessons you finished a while back. Tap one to replay it.
            </Text>
            <ScrollView style={styles.reviewList}>
              {reviewSuggestions.map((s) => (
                <Pressable
                  key={s.lesson.id}
                  style={styles.reviewRow}
                  onPress={() => {
                    setReviewOpen(false)
                    onStartLesson(s.lesson)
                  }}
                >
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewLevel}>
                      {s.levelId.toUpperCase()}
                    </Text>
                    <Text style={styles.reviewTopic} numberOfLines={1}>
                      {s.topicTitle}
                    </Text>
                  </View>
                  <Text style={styles.reviewTitle} numberOfLines={1}>
                    {s.lesson.title}
                  </Text>
                  <Text style={styles.reviewAge}>
                    {s.daysAgo === 1 ? '1 day ago' : `${s.daysAgo} days ago`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <View style={styles.modalBtn}>
                <LedgeButton
                  label="Close"
                  tone="ghost"
                  onPress={() => setReviewOpen(false)}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'xp' | 'primary' | 'success'
}) {
  const valueColor =
    accent === 'xp'
      ? colors.xp700
      : accent === 'primary'
        ? colors.primary700
        : accent === 'success'
          ? colors.success700
          : colors.text
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function ActionButton({
  label,
  tone,
  disabled,
  onPress,
}: {
  label: string
  tone: 'primary' | 'neutral'
  disabled?: boolean
  onPress: () => void
}) {
  return <LedgeButton label={label} tone={tone} disabled={disabled} onPress={onPress} />
}

const styles = StyleSheet.create({
  shell: {
    padding: space.lg,
    paddingBottom: 100,
    gap: space.lg,
  },

  // Header card
  headCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
  },
  headAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
  },
  headIdentity: {
    flex: 1,
    minWidth: 0,
  },
  headName: {
    fontSize: fontSizes.xl,
    fontWeight: '900',
    color: colors.text,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  tierPillText: {
    fontSize: fontSizes.xs,
    fontWeight: '800',
    color: colors.text,
  },
  offlinePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
  },
  offlinePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSubtle,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  editBtnWrap: {
    minWidth: 84,
  },

  // Stats grid (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  statTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: space.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.xxl,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Sections
  section: {
    gap: space.sm,
  },
  sectionHead: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: space.xs,
  },
  actionsCol: {
    gap: space.sm,
  },
  actionHint: {
    marginTop: space.sm,
    fontSize: fontSizes.sm,
    color: colors.textSubtle,
    fontStyle: 'italic',
  },
  about: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },

  // Modal shared
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58, 37, 22, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 22,
    gap: space.md,
  },
  modalTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  modalInput: {
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.sm,
    marginTop: space.xs,
  },
  modalBtn: {
    minWidth: 100,
  },

  // Avatar grid (5 columns)
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

  // Review list
  reviewList: {
    maxHeight: 360,
  },
  reviewRow: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: space.sm,
    gap: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  reviewLevel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.primary700,
    backgroundColor: colors.primary100,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  reviewTopic: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    flexShrink: 1,
  },
  reviewTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  reviewAge: {
    fontSize: 11,
    color: colors.textSubtle,
  },
})
