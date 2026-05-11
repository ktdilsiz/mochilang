/**
 * Offline league hook — owns AsyncStorage persistence, daily settlement,
 * and weekly rollover for the locally-generated bot cohort.
 *
 * Each calendar day that's elapsed since the last settle, every bot
 * earns XP from its archetype (so the cohort moves even on user rest
 * days). On top of that, the day we're currently settling on adds a
 * small rank-decay bonus keyed off the user's totalXp delta since the
 * last settle. Storage version bumps when the schema changes — older
 * blobs get discarded.
 */

import { useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  applyTierChange,
  DEMOTE_RANK,
  freshState,
  generateCohort,
  mondayOf,
  PROMOTE_RANK,
  rankUserIn,
  settleThrough,
  ymd,
  type OfflineBot,
  type OfflineLeagueState,
  type ProfileState,
  type ProgressState,
} from '@mochilang/shared'

// v2 is the archetype-aware schema. Older blobs are abandoned so the
// regenerator can lay down the new shape without merging logic.
const STORAGE_KEY = 'mochilang:offlineLeague:v2'

export interface OfflineLeagueView {
  bots: OfflineBot[]
  weekStart: string
  /** Rank by bot id BEFORE the most recent settle. Drives ↑/↓/— arrows. */
  prevRanks: Record<string, number>
  /** True until AsyncStorage hydration completes. */
  loading: boolean
}

interface UseOfflineLeagueArgs {
  progress: ProgressState
  profile: ProfileState
  setProfile: (patch: Partial<ProfileState>) => void
}

export function useOfflineLeague({
  progress,
  profile,
  setProfile,
}: UseOfflineLeagueArgs): OfflineLeagueView {
  const [state, setState] = useState<OfflineLeagueState | null>(null)
  const [loading, setLoading] = useState(true)

  const setProfileRef = useRef(setProfile)
  setProfileRef.current = setProfile

  // Hydrate from disk once on mount.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (alive && raw) {
          const parsed = JSON.parse(raw) as OfflineLeagueState
          setState(parsed)
        }
      } catch {
        /* first run, or corrupt blob — we'll regenerate */
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Settlement / rollover effect. Runs when user XP advances OR on
  // first hydration. The three branches are: first-ever generate,
  // week rollover (finalize prior, regen, tier shift), daily settle.
  useEffect(() => {
    if (loading) return
    const today = ymd(new Date())
    const currentWeek = mondayOf()

    // First-ever load — generate cleanly, baseline the XP snapshot to
    // the user's current totalXp so bots aren't credited for everything
    // earned before the offline league existed. Then seed one day of
    // archetype activity (yesterday → today) so the cohort isn't a wall
    // of zeros on first open.
    if (!state) {
      const fresh = freshState(currentWeek, today, progress.totalXp)
      const seeded = settleThrough(fresh.cohort, addDaysLocal(today, -1), today, 0)
      const next: OfflineLeagueState = {
        ...fresh,
        cohort: seeded.cohort,
        prevRanks: seeded.prevRanks,
      }
      setState(next)
      void persist(next)
      return
    }

    let next = state

    // Week rollover: finalize the prior week first.
    if (next.weekStart !== currentWeek) {
      const prevRank = rankUserIn(next.cohort, next.userWeeklyXpAtLastSettle)
      const change =
        prevRank <= PROMOTE_RANK
          ? 'promoted'
          : prevRank >= DEMOTE_RANK
            ? 'demoted'
            : 'held'
      setProfileRef.current({
        leagueTier: applyTierChange(profile.leagueTier, prevRank),
        lastWeekRank: prevRank,
        lastWeekChange: change,
      })
      const fresh = generateCohort(currentWeek, next.recentNames)
      // Seed one day of activity so the new cohort isn't a wall of zeros
      // when the user opens on Monday morning.
      const seeded = settleThrough(fresh, addDaysLocal(today, -1), today, 0)
      next = {
        weekStart: currentWeek,
        cohort: seeded.cohort,
        lastSettledDate: today,
        userTotalXpAtLastSettle: progress.totalXp,
        userWeeklyXpAtLastSettle: 0,
        prevRanks: seeded.prevRanks,
        prevWeekRank: prevRank,
        recentNames: fresh.map((b) => b.name),
      }
    }

    // Daily settlement — only on date change. Same-day re-renders just
    // refresh snapshots so tomorrow's settle has the right baseline.
    if (next.lastSettledDate !== today) {
      const userDelta = Math.max(0, progress.totalXp - next.userTotalXpAtLastSettle)
      const { cohort, prevRanks } = settleThrough(
        next.cohort,
        next.lastSettledDate,
        today,
        userDelta,
      )
      next = {
        ...next,
        cohort,
        prevRanks,
        lastSettledDate: today,
        userTotalXpAtLastSettle: progress.totalXp,
        userWeeklyXpAtLastSettle: progress.weeklyXp,
      }
    } else if (
      next.userTotalXpAtLastSettle !== progress.totalXp ||
      next.userWeeklyXpAtLastSettle !== progress.weeklyXp
    ) {
      // No date change but the user earned XP — refresh the snapshot.
      next = {
        ...next,
        userTotalXpAtLastSettle: progress.totalXp,
        userWeeklyXpAtLastSettle: progress.weeklyXp,
      }
    } else {
      return // nothing to do
    }

    setState(next)
    void persist(next)
    // We intentionally don't include `profile` in deps — only the tier
    // mutation we issue ourselves should change it, and that path uses
    // setProfileRef. Including profile would cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, state, progress.totalXp, progress.weeklyXp])

  return {
    bots: state?.cohort ?? [],
    weekStart: state?.weekStart ?? mondayOf(),
    prevRanks: state?.prevRanks ?? {},
    loading: loading || state === null,
  }
}

async function persist(s: OfflineLeagueState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* in-memory state survives the session */
  }
}

// Local helper — same as the addDays in shared/offlineLeague, kept inline
// to avoid an export round-trip.
function addDaysLocal(dateYMD: string, delta: number): string {
  const [y, m, d] = dateYMD.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return ymd(dt)
}

