/**
 * Mochilang progression state — RN port.
 *
 * Same hook surface as the web version (`state`, `recordCompletion`,
 * `reset`, `isCompleted`) but uses AsyncStorage instead of localStorage
 * for the write-through cache. Mirrors apps/web/src/state.ts so screens
 * can be platform-shared once we extract them.
 */

import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  api,
  ApiError,
  PROGRESS_DEFAULT,
  type ProgressResponse,
  type ProgressState,
} from '@mochilang/shared'

const STORAGE_KEY = 'mochilang:progress:v1'

function fromResponse(r: ProgressResponse): ProgressState {
  return {
    totalXp: r.totalXp,
    streak: r.streak,
    lastActiveDate: r.lastActiveDate,
    weeklyXp: r.weeklyXp,
    weekStart: r.weekStart,
    results: r.results,
  }
}

async function save(s: ProgressState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore — keep in-memory state for the rest of the session */
  }
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(PROGRESS_DEFAULT)

  // Load cached value on mount, then refresh from API.
  useEffect(() => {
    let alive = true
    const ctrl = new AbortController()
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (alive && raw) {
          setState({ ...PROGRESS_DEFAULT, ...JSON.parse(raw) })
        }
      } catch {
        /* ignore */
      }
      try {
        const r = await api.getProgress(ctrl.signal)
        if (!alive) return
        const next = fromResponse(r)
        setState(next)
        void save(next)
      } catch (err) {
        if (err instanceof ApiError) {
          // 4xx — keep cached state
          return
        }
        // Network/CORS — same: keep cached state.
      }
    })()
    return () => {
      alive = false
      ctrl.abort()
    }
  }, [])

  const recordCompletion = useCallback(
    async (
      lessonId: string,
      mistakes: number,
      baseXp: number,
      opts?: { xpMultiplier?: number; useStreakFreeze?: boolean },
    ) => {
      const multiplier = opts?.xpMultiplier ?? 1
      try {
        // Pre-multiply baseXp so the server (which doesn't know about
        // power-ups yet) credits the doubled amount. Server still
        // applies the no-mistake 2× on top.
        const r = await api.recordCompletion({
          lessonId,
          mistakes,
          baseXp: baseXp * multiplier,
        })
        const next: ProgressState = {
          totalXp: r.totalXp,
          streak: r.streak,
          weeklyXp: r.weeklyXp,
          weekStart: r.weekStart,
          lastActiveDate: r.lastActiveDate,
          results: r.results,
        }
        setState(next)
        void save(next)
      } catch {
        setState((prev) => {
          const next = optimisticCompletion(prev, lessonId, mistakes, baseXp, opts)
          void save(next)
          return next
        })
      }
    },
    []
  )

  /**
   * Developer-mode helper: bump totalXp + weeklyXp + streak without
   * touching the per-lesson results map. The server isn't involved —
   * this is a local-only nudge used by the dev power-up button.
   */
  const addDevXp = useCallback(async (amount: number) => {
    setState((prev) => {
      const today = todayKey()
      const yesterday = yesterdayKey()
      const thisMonday = mondayOf()
      const inSameWeek = prev.weekStart === thisMonday
      let streak = prev.streak
      if (prev.lastActiveDate === today) {
        /* keep */
      } else if (prev.lastActiveDate === yesterday) {
        streak = prev.streak + 1
      } else {
        streak = 1
      }
      const next: ProgressState = {
        ...prev,
        totalXp: prev.totalXp + amount,
        weeklyXp: (inSameWeek ? prev.weeklyXp : 0) + amount,
        weekStart: thisMonday,
        lastActiveDate: today,
        streak,
      }
      void save(next)
      return next
    })
  }, [])

  const reset = useCallback(async () => {
    try {
      const r = await api.resetProgress()
      const next = fromResponse(r)
      setState(next)
      void save(next)
    } catch {
      setState(PROGRESS_DEFAULT)
      void save(PROGRESS_DEFAULT)
    }
  }, [])

  const isCompleted = (lessonId: string) => !!state.results[lessonId]

  return { state, recordCompletion, addDevXp, reset, isCompleted }
}

// Same offline-fallback math as the web hook + the Go backend, with a
// small extension: optional xpMultiplier (Double XP power-up) and
// useStreakFreeze (pretend the user played yesterday so the streak
// gains +1 instead of resetting to 1).
function optimisticCompletion(
  prev: ProgressState,
  lessonId: string,
  mistakes: number,
  baseXp: number,
  opts?: { xpMultiplier?: number; useStreakFreeze?: boolean }
): ProgressState {
  const today = todayKey()
  const yesterday = yesterdayKey()
  const multiplier = opts?.xpMultiplier ?? 1
  const xpEarned = (mistakes === 0 ? baseXp * 2 : baseXp) * multiplier
  const prevResult = prev.results[lessonId]
  const bestMistakes =
    prevResult === undefined
      ? mistakes
      : Math.min(prevResult.bestMistakes, mistakes)

  // If a freeze is being burned, treat the gap as if yesterday was active.
  const effectiveLastActive = opts?.useStreakFreeze
    ? yesterday
    : prev.lastActiveDate

  let streak = prev.streak
  if (effectiveLastActive === today) {
    /* keep */
  } else if (effectiveLastActive === yesterday) {
    streak = prev.streak + 1
  } else {
    streak = 1
  }

  const thisMonday = mondayOf()
  const inSameWeek = prev.weekStart === thisMonday
  const weeklyXp = (inSameWeek ? prev.weeklyXp : 0) + xpEarned

  return {
    totalXp: prev.totalXp + xpEarned,
    streak,
    weeklyXp,
    weekStart: thisMonday,
    lastActiveDate: today,
    results: {
      ...prev.results,
      [lessonId]: {
        bestMistakes,
        completions: (prevResult?.completions ?? 0) + 1,
        lastAt: Date.now(),
      },
    },
  }
}

function todayKey(): string {
  const d = new Date()
  return ymd(d)
}
function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return ymd(d)
}
function mondayOf(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return ymd(d)
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
