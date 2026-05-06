/**
 * Mochilang persistent progression state.
 *
 * Mirrors the pattern in mochiread but tuned for a learning-app domain:
 * total XP, daily streak, set of completed lesson IDs, and per-lesson
 * best results (mistakes + perfect bonus). Backed by localStorage; the
 * `usePersistedState` hook loads on mount and saves on every change.
 */

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'mochilang:progress:v1'

export interface LessonResult {
  /** Lowest mistake count across all completions. */
  bestMistakes: number
  /** Number of times this lesson has been finished. */
  completions: number
  /** Last completion timestamp in ms. */
  lastAt: number
}

export interface ProgressState {
  totalXp: number
  /** Day count of consecutive activity ending today (or yesterday). */
  streak: number
  /** Local-day key (YYYY-MM-DD) of the last day with activity. */
  lastActiveDate: string | null
  /** Lesson id → best result. */
  results: Record<string, LessonResult>
}

const DEFAULT_STATE: ProgressState = {
  totalXp: 0,
  streak: 0,
  lastActiveDate: null,
  results: {},
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadState(): ProgressState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(s: ProgressState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Storage might be full or unavailable — don't crash, the UI continues
    // working with in-memory state for the rest of the session.
  }
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  function recordCompletion(lessonId: string, mistakes: number, baseXp: number) {
    setState((prev) => {
      const today = todayKey()
      const prevResult = prev.results[lessonId]
      const bestMistakes =
        prevResult === undefined
          ? mistakes
          : Math.min(prevResult.bestMistakes, mistakes)
      const xpEarned = mistakes === 0 ? baseXp * 2 : baseXp

      // Streak: extend if active today already; +1 if last active was yesterday
      // or today; otherwise reset to 1.
      let streak = prev.streak
      if (prev.lastActiveDate === today) {
        // already counted today, just keep streak
      } else if (prev.lastActiveDate === yesterdayKey()) {
        streak = prev.streak + 1
      } else {
        streak = 1
      }

      return {
        totalXp: prev.totalXp + xpEarned,
        streak,
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
    })
  }

  function reset() {
    setState(DEFAULT_STATE)
  }

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
