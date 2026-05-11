/**
 * Offline league hook — owns AsyncStorage persistence, daily settlement,
 * and weekly rollover for the locally-generated bot cohort.
 *
 * Flow at hook mount + on user XP changes:
 *   1. Load stored state from AsyncStorage. If absent, generate fresh.
 *   2. If stored weekStart != mondayOf(today): finalize the prior week
 *      (snapshot the user's rank, apply tier promote/demote via the
 *      passed-in setProfile), then generate a fresh cohort starting at 0.
 *   3. If stored lastSettledDate < today: roll one settlement using the
 *      delta in the user's totalXp since the last settle. Update the
 *      snapshot so subsequent settlements don't double-count.
 *
 * Settlement uses lifetime totalXp so it stays correct across weekly XP
 * resets — the bot rewards are proportional to *new* XP earned regardless
 * of whether that XP was attributed to this week or last.
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
  settleDay,
  ymd,
  type OfflineBot,
  type OfflineLeagueState,
  type ProfileState,
  type ProgressState,
} from '@mochilang/shared'

const STORAGE_KEY = 'mochilang:offlineLeague:v1'

export interface OfflineLeagueView {
  /** Bot rows + a synthetic "me" row, unsorted; caller renders sorted. */
  bots: OfflineBot[]
  /** Current week the cohort belongs to (YYYY-MM-DD Monday). */
  weekStart: string
  /** True until the first AsyncStorage hydration completes. */
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

  // setProfile is recreated on every parent render; cache the latest in
  // a ref so the settlement effect can call it without re-running.
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
        /* ignore — first run, or corrupted blob; we'll regenerate */
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // The settlement effect runs whenever the user's lifetime XP advances
  // OR when state hydrates. It owns three responsibilities: first-ever
  // generation, weekly rollover, and daily settlement. The result is
  // persisted before commit so a crash mid-render doesn't lose progress.
  useEffect(() => {
    if (loading) return
    const today = ymd(new Date())
    const currentWeek = mondayOf()

    // First-ever load — generate cleanly and bail. Baseline the XP
    // snapshot to the user's current totalXp so we don't credit the
    // bots for everything the user earned before the offline league
    // existed.
    if (!state) {
      const next = freshState(currentWeek, today, progress.totalXp)
      void persist(next)
      setState(next)
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
      const nextTier = applyTierChange(profile.leagueTier, prevRank)
      setProfileRef.current({
        leagueTier: nextTier,
        lastWeekRank: prevRank,
        lastWeekChange: change,
      })
      next = {
        weekStart: currentWeek,
        cohort: generateCohort(currentWeek),
        lastSettledDate: today,
        userTotalXpAtLastSettle: progress.totalXp,
        userWeeklyXpAtLastSettle: 0,
        prevWeekRank: prevRank,
      }
    }

    // Daily settlement — only fire when the date actually changes. Same
    // day re-renders just refresh the snapshot of weeklyXp so the next
    // settle has the right baseline.
    if (next.lastSettledDate !== today) {
      const xpGained = Math.max(0, progress.totalXp - next.userTotalXpAtLastSettle)
      next = {
        ...next,
        cohort: settleDay(next.cohort, xpGained),
        lastSettledDate: today,
        userTotalXpAtLastSettle: progress.totalXp,
        userWeeklyXpAtLastSettle: progress.weeklyXp,
      }
    } else if (
      next.userTotalXpAtLastSettle !== progress.totalXp ||
      next.userWeeklyXpAtLastSettle !== progress.weeklyXp
    ) {
      // No date change but the user earned XP — store the snapshot so
      // tomorrow's settlement starts from the right baseline.
      next = {
        ...next,
        userTotalXpAtLastSettle: progress.totalXp,
        userWeeklyXpAtLastSettle: progress.weeklyXp,
      }
    } else {
      // Nothing changed — skip the AsyncStorage write to avoid churn.
      return
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
