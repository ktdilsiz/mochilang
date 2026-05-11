import { useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  api,
  ApiError,
  LEAGUE_TIERS,
  PROMOTE_RANK,
  DEMOTE_RANK,
  tierAt,
  daysUntilMonday,
  daysSinceMonday,
  mondayOf,
  type LeagueResponse,
  type LeagueRow,
  type ProfileState,
  type ProgressState,
} from '@mochilang/shared'
import { COMPETITORS, botWeeklyXp } from '../data/competitors'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface OuterProps {
  /** When rendered inside SocialScreen's segment, skip our own safe-area top. */
  nested?: boolean
}
interface Props extends OuterProps {
  progress: ProgressState
  profile: ProfileState
  setProfile: (patch: Partial<ProfileState>) => void
}

/**
 * View-model — same shape the web screen uses. The server already
 * returns this for /api/league; we just unwrap the parts we render.
 *
 * The mobile build is API-only by design (Phase 1), so when the fetch
 * fails we surface an offline message rather than synthesising a bot
 * leaderboard the way the web version does.
 */
interface ViewModel {
  rows: LeagueRow[]
  userRank: number
  userTier: number
  lastWeekRank: number | null
  lastWeekChange: 'promoted' | 'demoted' | 'held' | null
}

function viewFromAPI(r: LeagueResponse): ViewModel {
  return {
    rows: r.rows,
    userRank: r.userRank,
    userTier: r.userTier,
    lastWeekRank: r.lastWeekRank,
    lastWeekChange: r.lastWeekChange,
  }
}

/**
 * Offline view: same shape the API would have returned, synthesized
 * from bundled competitors + local progress/profile. Mirrors the web
 * `buildOfflineView` exactly so both clients show the same standings
 * with no server reachable.
 */
function buildOfflineView(progress: ProgressState, profile: ProfileState): ViewModel {
  const weekStart = mondayOf()
  const dayIdx = daysSinceMonday()
  const userWeeklyXp = progress.weekStart === weekStart ? progress.weeklyXp : 0

  const rows: LeagueRow[] = COMPETITORS.map((b) => ({
    id: b.id,
    name: b.name,
    avatar: b.avatar,
    flag: b.flag,
    weeklyXp: botWeeklyXp(b, weekStart, dayIdx),
    isUser: false,
  }))
  rows.push({
    id: 'me',
    name: profile.name ?? 'You',
    avatar: 'user',
    weeklyXp: userWeeklyXp,
    isUser: true,
  })
  rows.sort((a, b) => b.weeklyXp - a.weeklyXp || a.id.localeCompare(b.id))
  const userRank = rows.findIndex((r) => r.isUser) + 1

  return {
    rows,
    userRank,
    userTier: profile.leagueTier,
    lastWeekRank: profile.lastWeekRank,
    lastWeekChange: profile.lastWeekChange,
  }
}

export default function LeagueScreen({
  progress,
  profile,
  setProfile,
  nested,
}: Props) {
  const insets = useSafeAreaInsets()
  const topInset = nested ? 0 : insets.top + space.md
  // Seed with the offline view synchronously so the leaderboard
  // renders something useful on first paint even before any fetch.
  const [vm, setVM] = useState<ViewModel | null>(() =>
    buildOfflineView(progress, profile)
  )
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch on mount; re-fetch whenever weeklyXp changes (i.e. the user
  // finished a lesson and came back to this screen). The fetch is cheap
  // and the LeagueScreen unmounts when the user switches tabs, so a
  // stale view is rare in practice.
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    void (async () => {
      try {
        const r = await api.getLeague(ctrl.signal)
        setVM(viewFromAPI(r))
        setOffline(false)
        // Mirror server-resolved tier/rank/banner into the profile cache
        // so the banner renders + survives a remount.
        setProfile({
          leagueTier: r.userTier,
          lastWeekRank: r.lastWeekRank,
          lastWeekChange: r.lastWeekChange,
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        // Network error or short-circuited by offline mode — both
        // resolve to bundled-JSON view. The synth standings are not
        // authoritative; the server reconciles on the next live fetch.
        setOffline(true)
        setVM(buildOfflineView(progress, profile))
      } finally {
        setLoading(false)
      }
    })()
    return () => ctrl.abort()
    // setProfile is stable from the parent's useCallback; we only want
    // to re-fetch when the user actually accumulates XP.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.weeklyXp])

  const daysLeft = daysUntilMonday()
  const tier = tierAt(vm?.userTier ?? profile.leagueTier)
  const userTierIdx = vm?.userTier ?? profile.leagueTier
  const nextTier =
    userTierIdx < LEAGUE_TIERS.length - 1 ? LEAGUE_TIERS[userTierIdx + 1] : null

  const banner = useMemo(() => {
    const change = vm?.lastWeekChange ?? profile.lastWeekChange
    if (!change || change === 'held') return null
    return change
  }, [vm?.lastWeekChange, profile.lastWeekChange])

  const lastWeekRank = vm?.lastWeekRank ?? profile.lastWeekRank

  return (
    <ScrollView
      contentContainerStyle={[styles.shell, { paddingTop: topInset }]}
    >
      {banner && (
        <View
          style={[
            styles.banner,
            banner === 'promoted' ? styles.bannerUp : styles.bannerDown,
          ]}
        >
          <Text style={styles.bannerEmoji}>
            {banner === 'promoted' ? '🎉' : '📉'}
          </Text>
          <View style={styles.bannerText}>
            <Text
              style={[
                styles.bannerTitle,
                banner === 'promoted' ? styles.bannerTitleUp : styles.bannerTitleDown,
              ]}
            >
              {banner === 'promoted'
                ? `You promoted to ${tier.name}!`
                : `Demoted to ${tier.name}`}
            </Text>
            <Text
              style={[
                styles.bannerBody,
                banner === 'promoted' ? styles.bannerBodyUp : styles.bannerBodyDown,
              ]}
            >
              Last week's finish: rank {lastWeekRank ?? '—'}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Dismiss"
            onPress={() => setProfile({ lastWeekChange: null })}
            style={({ pressed }) => [
              styles.bannerClose,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text
              style={[
                styles.bannerCloseText,
                banner === 'promoted' ? styles.bannerTitleUp : styles.bannerTitleDown,
              ]}
            >
              ×
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.header}>
        <LinearGradient
          colors={[tier.color, tier.edge]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.tierBadge, { borderColor: tier.edge }]}
        >
          <Text style={styles.tierEmoji}>{tier.emoji}</Text>
        </LinearGradient>
        <Text style={styles.tierName}>{tier.name} League</Text>
        <Text style={styles.tierSub}>
          {nextTier
            ? `Top ${PROMOTE_RANK} promote to ${nextTier.name}`
            : 'Top of the ladder — defend your spot!'}
          {offline ? '  ·  OFFLINE' : ''}
        </Text>
        <View style={styles.deadlinePill}>
          <Text style={styles.deadlineText}>
            {daysLeft === 0
              ? 'Last day of the week'
              : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          </Text>
        </View>
      </View>

      {loading && !vm ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Loading this week's standings…</Text>
        </View>
      ) : offline || !vm ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>
            League is offline — connect to see this week's standings.
          </Text>
        </View>
      ) : (
        <View style={styles.board}>
          {vm.rows.map((r, idx) => {
            const rank = idx + 1
            const inPromote = rank <= PROMOTE_RANK
            const inDemote = rank >= DEMOTE_RANK
            return (
              <View
                key={r.id}
                style={[
                  styles.row,
                  inPromote && styles.rowPromote,
                  inDemote && styles.rowDemote,
                  r.isUser && styles.rowUser,
                ]}
              >
                <Text
                  style={[
                    styles.rank,
                    inPromote && styles.rankPromote,
                    inDemote && styles.rankDemote,
                  ]}
                >
                  {rank}
                </Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>
                    {r.isUser ? '🌟' : r.avatar}
                  </Text>
                </View>
                <View style={styles.nameWrap}>
                  <Text
                    style={[styles.name, r.isUser && styles.nameUser]}
                    numberOfLines={1}
                  >
                    {r.name}
                    {r.flag ? ` ${r.flag}` : ''}
                  </Text>
                </View>
                <Text style={styles.xp}>
                  {r.weeklyXp.toLocaleString()} XP
                </Text>
              </View>
            )
          })}
        </View>
      )}

      {vm && (
        <Text style={styles.footer}>
          Your rank this week:{' '}
          <Text style={styles.footerStrong}>
            {vm.userRank} / {vm.rows.length}
          </Text>
        </Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  shell: {
    padding: space.lg,
    paddingBottom: space.xxl + space.xxl,
    gap: space.lg,
  },

  // ---------- Banner ----------
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  bannerUp: {
    backgroundColor: colors.success100,
    borderColor: colors.success500,
  },
  bannerDown: {
    backgroundColor: colors.error100,
    borderColor: colors.error500,
  },
  bannerEmoji: { fontSize: 28 },
  bannerText: { flex: 1 },
  bannerTitle: { fontWeight: '900', fontSize: fontSizes.md },
  bannerTitleUp: { color: colors.success700 },
  bannerTitleDown: { color: colors.error700 },
  bannerBody: { fontSize: fontSizes.xs, marginTop: 2 },
  bannerBodyUp: { color: colors.success700, opacity: 0.85 },
  bannerBodyDown: { color: colors.error700, opacity: 0.85 },
  bannerClose: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  bannerCloseText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
  },

  // ---------- Header ----------
  header: {
    alignItems: 'center',
    gap: 6,
    paddingTop: space.sm,
  },
  tierBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
    // Light shadow approximation of --shadow-elev.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  tierEmoji: { fontSize: 56, lineHeight: 60 },
  tierName: {
    fontSize: fontSizes.xxl + 2,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: space.xs,
  },
  tierSub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  deadlinePill: {
    marginTop: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  deadlineText: {
    fontSize: fontSizes.xs,
    fontWeight: '800',
    color: colors.textSubtle,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ---------- Board ----------
  board: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 6,
    gap: 2,
    // Subtle card shadow.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  rowPromote: {
    backgroundColor: 'rgba(88, 204, 2, 0.08)',
    borderLeftColor: colors.success500,
  },
  rowDemote: {
    backgroundColor: 'rgba(255, 75, 75, 0.07)',
    borderLeftColor: colors.error500,
  },
  rowUser: {
    backgroundColor: colors.cream100,
    borderWidth: 2,
    borderColor: colors.primary300,
    borderLeftWidth: 2,
  },
  rank: {
    width: 28,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: fontSizes.md,
    color: colors.textMuted,
  },
  rankPromote: { color: colors.success700 },
  rankDemote: { color: colors.error700 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEmoji: { fontSize: 22, lineHeight: 26 },
  nameWrap: { flex: 1 },
  name: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  nameUser: { fontWeight: '800' },
  xp: {
    fontWeight: '800',
    fontSize: fontSizes.sm,
    color: colors.xp700,
  },

  // ---------- Footer / states ----------
  footer: {
    textAlign: 'center',
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  footerStrong: {
    color: colors.text,
    fontWeight: '900',
  },
  stateBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: 'center',
  },
  stateText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
})
