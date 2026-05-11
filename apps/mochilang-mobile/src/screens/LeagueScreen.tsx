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
  lastActiveDaysAgo,
  ymd,
  type LeagueResponse,
  type LeagueRow,
  type OfflineBot,
  type ProfileState,
  type ProgressState,
} from '@mochilang/shared'
import { useOfflineLeague } from '../state/useOfflineLeague'
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
 * Row shape rendered by the screen. Includes optional realism fields
 * that only the offline path populates — streak, lifetime XP, "new
 * this week" tag, rank change vs yesterday's settle, last-active label.
 * The API path leaves them undefined and the renderer skips them.
 */
interface RenderRow {
  id: string
  name: string
  avatar: string
  flag?: string
  weeklyXp: number
  isUser: boolean
  // Optional offline-only realism extras
  streak?: number
  lifetimeXp?: number
  isNew?: boolean
  /** Positive: moved up by N ranks since last settle. Negative: down. */
  rankDelta?: number
  /** Friendly active label ("active today" / "2d ago" / etc). */
  activeLabel?: string
}

interface ViewModel {
  rows: RenderRow[]
  userRank: number
  userTier: number
  lastWeekRank: number | null
  lastWeekChange: 'promoted' | 'demoted' | 'held' | null
}

function viewFromAPI(r: LeagueResponse): ViewModel {
  return {
    rows: r.rows.map((row: LeagueRow) => ({ ...row })),
    userRank: r.userRank,
    userTier: r.userTier,
    lastWeekRank: r.lastWeekRank,
    lastWeekChange: r.lastWeekChange,
  }
}

function activeLabelFor(daysAgo: number | null): string {
  if (daysAgo === null) return 'no activity yet'
  if (daysAgo === 0) return 'active today'
  if (daysAgo === 1) return 'yesterday'
  return `${daysAgo}d ago`
}

/**
 * Build the view-model from the offline-league hook output: glue the
 * synthetic "me" row in next to the bots, sort, attach realism fields
 * (streak, rank delta, active label, "new" badge), and figure out where
 * the user landed.
 */
function buildOfflineView(
  bots: OfflineBot[],
  prevRanks: Record<string, number>,
  progress: ProgressState,
  profile: ProfileState,
): ViewModel {
  const today = ymd(new Date())
  const userWeeklyXp = progress.weeklyXp

  const rows: RenderRow[] = bots.map((b) => ({
    id: b.id,
    name: b.name,
    avatar: b.avatar,
    flag: b.flag,
    weeklyXp: b.weeklyXp,
    isUser: false,
    streak: b.streak,
    lifetimeXp: b.lifetimeXp,
    isNew: b.isNew,
    activeLabel: activeLabelFor(lastActiveDaysAgo(b.id, b.archetype, today)),
  }))
  rows.push({
    id: 'me',
    name: profile.name ?? 'You',
    avatar: 'user',
    weeklyXp: userWeeklyXp,
    isUser: true,
  })
  rows.sort((a, b) => b.weeklyXp - a.weeklyXp || a.id.localeCompare(b.id))

  // Now that we have the new ranks, compute deltas vs the captured
  // pre-settle ranks. The user's row has no prevRank so the delta
  // stays undefined.
  rows.forEach((row, idx) => {
    const newRank = idx + 1
    const prev = prevRanks[row.id]
    if (typeof prev === 'number') row.rankDelta = prev - newRank
  })

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
  // The hook owns the offline cohort + daily settlement. Its `bots`
  // array is what we render until/unless the API path lands.
  const offlineLeague = useOfflineLeague({ progress, profile, setProfile })
  const [vm, setVM] = useState<ViewModel | null>(null)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)

  // Keep the offline view-model fresh whenever the hook's cohort
  // mutates (settlement, rollover, hydration). The API effect below
  // can still overwrite this when the server is reachable.
  useEffect(() => {
    if (offlineLeague.loading) return
    if (offline) {
      setVM(buildOfflineView(offlineLeague.bots, offlineLeague.prevRanks, progress, profile))
    } else if (!vm) {
      // Seed with the offline view synchronously on first paint so the
      // board renders something while the API fetch is in flight.
      setVM(buildOfflineView(offlineLeague.bots, offlineLeague.prevRanks, progress, profile))
    }
    // We only depend on the cohort + weeklyXp here; profile changes
    // would loop through setProfile from the hook. The vm/offline
    // pair drives whether we replace the view-model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineLeague.bots, offlineLeague.prevRanks, progress.weeklyXp, offline])

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
        // Network error or short-circuited by offline mode — flip
        // into offline mode. The other effect drops the offline cohort
        // into vm; we just need to flip the flag here.
        setOffline(true)
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
      ) : !vm ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Setting up your league…</Text>
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
                  <View style={styles.nameLine}>
                    <Text
                      style={[styles.name, r.isUser && styles.nameUser]}
                      numberOfLines={1}
                    >
                      {r.name}
                      {r.flag ? ` ${r.flag}` : ''}
                    </Text>
                    {r.isNew && <Text style={styles.newBadge}>NEW</Text>}
                  </View>
                  {!r.isUser && (
                    <View style={styles.metaLine}>
                      {typeof r.streak === 'number' && (
                        <Text style={styles.metaPiece}>🔥 {r.streak}</Text>
                      )}
                      {typeof r.lifetimeXp === 'number' && (
                        <Text style={styles.metaPiece}>
                          ⚡ {r.lifetimeXp.toLocaleString()}
                        </Text>
                      )}
                      {r.activeLabel && (
                        <Text style={styles.metaActive}>{r.activeLabel}</Text>
                      )}
                    </View>
                  )}
                </View>
                <View style={styles.xpCol}>
                  <Text style={styles.xp}>{r.weeklyXp.toLocaleString()} XP</Text>
                  {typeof r.rankDelta === 'number' && r.rankDelta !== 0 && (
                    <Text
                      style={[
                        styles.delta,
                        r.rankDelta > 0 ? styles.deltaUp : styles.deltaDown,
                      ]}
                    >
                      {r.rankDelta > 0 ? `▲${r.rankDelta}` : `▼${-r.rankDelta}`}
                    </Text>
                  )}
                </View>
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
  nameWrap: { flex: 1, gap: 2 },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: fontSizes.md,
    color: colors.text,
    flexShrink: 1,
  },
  nameUser: { fontWeight: '800' },
  newBadge: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#fff',
    backgroundColor: colors.primary500,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  metaPiece: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: '700',
  },
  metaActive: {
    fontSize: 10,
    color: colors.textSubtle,
    fontStyle: 'italic',
  },
  xpCol: { alignItems: 'flex-end', gap: 2, minWidth: 64 },
  xp: {
    fontWeight: '800',
    fontSize: fontSizes.sm,
    color: colors.xp700,
  },
  delta: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  deltaUp: { color: colors.success700 },
  deltaDown: { color: colors.error700 },

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
