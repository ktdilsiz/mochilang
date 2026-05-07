/**
 * Mochilang progression state — API-backed with localStorage write-through.
 *
 * The backend is the source of truth: lesson completions, XP totals, streak
 * accounting, and weekly XP rollover all happen server-side. localStorage
 * is a write-through cache so the UI can paint instantly on reload (and
 * keep working if the API is briefly unreachable).
 *
 * The hook still exposes the same shape (`state`, `recordCompletion`,
 * `reset`, `isCompleted`) so screens didn't have to change when we moved
 * from local-only to API-backed.
 */

import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, type ProgressResponse } from '@mochilang/shared'

const STORAGE_KEY = 'mochilang:progress:v1'

export interface LessonResult {
  bestMistakes: number
  completions: number
  lastAt: number
}

export interface ProgressState {
  totalXp: number
  streak: number
  lastActiveDate: string | null
  results: Record<string, LessonResult>
  weeklyXp: number
  weekStart: string | null
}

const DEFAULT_STATE: ProgressState = {
  totalXp: 0,
  streak: 0,
  lastActiveDate: null,
  results: {},
  weeklyXp: 0,
  weekStart: null,
}

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

function loadState(): ProgressState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<ProgressState>) }
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(s: ProgressState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* storage full / disabled — keep going with in-memory state */
  }
}

export function useProgress() {
  // Initial render uses the cached value so the home screen can paint XP
  // and streak immediately. The hydrate effect then refreshes from the API.
  const [state, setState] = useState<ProgressState>(loadState)

  // Hydrate from API on mount. If the API is unreachable, keep showing the
  // cached state — the user can still complete lessons offline; they'll
  // sync the next time the API call succeeds.
  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await api.getProgress(ctrl.signal)
        const next = fromResponse(r)
        setState(next)
        saveState(next)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!(err instanceof ApiError)) {
          // Network/CORS error — running offline. Cached state stays.
          console.warn('useProgress: API offline; using cached state', err)
        } else {
          console.error('useProgress: API error', err)
        }
      }
    })()
    return () => ctrl.abort()
  }, [])

  // Persist on every state change so a tab close mid-session doesn't lose
  // progress that hadn't been pushed to the API yet.
  useEffect(() => {
    saveState(state)
  }, [state])

  const recordCompletion = useCallback(
    async (lessonId: string, mistakes: number, baseXp: number) => {
      try {
        const r = await api.recordCompletion({ lessonId, mistakes, baseXp })
        // The server's response IS the new state — apply it verbatim.
        setState((prev) => ({
          ...prev,
          totalXp: r.totalXp,
          streak: r.streak,
          weeklyXp: r.weeklyXp,
          weekStart: r.weekStart,
          lastActiveDate: r.lastActiveDate,
          results: r.results,
        }))
      } catch (err) {
        // Offline fallback: replay the same logic the server uses. The
        // next successful GET will reconcile any drift (the server is
        // authoritative on streak math anyway).
        console.warn('recordCompletion: offline, applying locally', err)
        setState((prev) => optimisticCompletion(prev, lessonId, mistakes, baseXp))
      }
    },
    []
  )

  const reset = useCallback(async () => {
    try {
      const r = await api.resetProgress()
      const next = fromResponse(r)
      setState(next)
      saveState(next)
    } catch (err) {
      console.warn('reset: offline, clearing locally', err)
      setState(DEFAULT_STATE)
      saveState(DEFAULT_STATE)
    }
  }, [])

  // Plain closure over the current `state` is fine — HomeScreen only calls
  // this inside .map, never compares references for memoization.
  const isCompleted = (lessonId: string) => !!state.results[lessonId]
  const completedCount = Object.keys(state.results).length

  return {
    state,
    recordCompletion,
    reset,
    isCompleted,
    completedCount,
  }
}

// optimisticCompletion duplicates the server's recordCompletion logic so
// offline play still updates XP/streak. The next successful API call will
// overwrite this with the canonical state.
function optimisticCompletion(
  prev: ProgressState,
  lessonId: string,
  mistakes: number,
  baseXp: number
): ProgressState {
  const today = todayKey()
  const yesterday = yesterdayKey()
  const xpEarned = mistakes === 0 ? baseXp * 2 : baseXp
  const prevResult = prev.results[lessonId]
  const bestMistakes =
    prevResult === undefined ? mistakes : Math.min(prevResult.bestMistakes, mistakes)

  let streak = prev.streak
  if (prev.lastActiveDate === today) {
    // already counted today
  } else if (prev.lastActiveDate === yesterday) {
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
