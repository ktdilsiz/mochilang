import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  DOUBLE_XP_DURATION_MS,
  MAX_STREAK_FREEZES,
} from '@mochilang/shared'
import { usePowerups } from '../state/usePowerups'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  onBack: () => void
}

/**
 * Two-card menu for the consumables in usePowerups:
 *
 *   ⚡ Double XP — activate a 30-min window, once a day
 *   🥶 Streak Freeze — claim one per week, auto-spent to bridge a 1-day gap
 *
 * Each card surfaces the current state (Active / Available / Used today
 * / Already claimed this week) so the user can read status at a glance,
 * then a single action button to claim/activate.
 */
export default function PowerupsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets()
  const p = usePowerups()

  const doubleXpStatus = p.doubleXpActive
    ? `Active — ${formatMs(p.doubleXpMsLeft)} left`
    : p.canActivateDoubleXp
      ? 'Available'
      : 'Used today — back tomorrow'

  const freezeStatus = p.canClaimStreakFreeze
    ? 'Available this week'
    : p.state.streakFreezeCount >= MAX_STREAK_FREEZES
      ? 'Bank is full'
      : 'Already claimed this week'

  return (
    <ScrollView
      style={styles.shell}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Power-ups</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.tagline}>
        Boosters that buy you a bit of slack. Use them when it counts.
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardIcon}>⚡</Text>
          <View style={styles.cardHeadText}>
            <Text style={styles.cardTitle}>Double XP</Text>
            <Text style={styles.cardSub}>
              Earn 2× XP on every lesson for{' '}
              {Math.round(DOUBLE_XP_DURATION_MS / 60000)} minutes.
            </Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View
            style={[styles.statusDot, p.doubleXpActive ? styles.dotOn : styles.dotOff]}
          />
          <Text style={styles.statusText}>{doubleXpStatus}</Text>
        </View>
        <LedgeButton
          label={p.doubleXpActive ? 'Active' : 'Activate (30 min)'}
          tone="primary"
          disabled={!p.canActivateDoubleXp}
          onPress={() => void p.activateDoubleXp()}
        />
        <Text style={styles.footnote}>One activation per day.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardIcon}>🥶</Text>
          <View style={styles.cardHeadText}>
            <Text style={styles.cardTitle}>Streak Freeze</Text>
            <Text style={styles.cardSub}>
              Save your streak when you miss a day. Spent automatically.
            </Text>
          </View>
        </View>
        <View style={styles.freezeRow}>
          <Text style={styles.freezeCount}>
            {p.state.streakFreezeCount} <Text style={styles.freezeOfMax}>/ {MAX_STREAK_FREEZES}</Text>
          </Text>
          <Text style={styles.freezeLabel}>in bank</Text>
        </View>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              p.canClaimStreakFreeze ? styles.dotOn : styles.dotOff,
            ]}
          />
          <Text style={styles.statusText}>{freezeStatus}</Text>
        </View>
        <LedgeButton
          label="Get a freeze"
          tone="success"
          disabled={!p.canClaimStreakFreeze}
          onPress={() => void p.claimStreakFreeze()}
        />
        <Text style={styles.footnote}>One claim per week, up to {MAX_STREAK_FREEZES} banked.</Text>
      </View>
    </ScrollView>
  )
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLink: { color: colors.textMuted, fontWeight: '800', fontSize: fontSizes.sm },
  title: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.text },
  tagline: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardIcon: { fontSize: 36 },
  cardHeadText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSizes.lg, fontWeight: '900', color: colors.text },
  cardSub: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOn: { backgroundColor: colors.success500 },
  dotOff: { backgroundColor: colors.border },
  statusText: { fontSize: fontSizes.sm, color: colors.text, fontWeight: '700' },
  footnote: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontStyle: 'italic',
  },
  freezeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  freezeCount: {
    fontSize: fontSizes.hero,
    fontWeight: '900',
    color: colors.text,
  },
  freezeOfMax: { fontSize: fontSizes.md, color: colors.textSubtle, fontWeight: '700' },
  freezeLabel: { fontSize: fontSizes.xs, color: colors.textSubtle, fontWeight: '700' },
})
