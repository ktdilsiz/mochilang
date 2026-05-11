/**
 * Power-ups hook — owns persistence + the 1-second tick that drives
 * the Double XP countdown display.
 *
 * AsyncStorage at mochilang:powerups:v1. We re-read once at mount and
 * write through after every mutating action.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  activateDoubleXp as activateDoubleXpPure,
  canActivateDoubleXp as canActivatePure,
  canClaimStreakFreeze as canClaimPure,
  claimStreakFreeze as claimPure,
  consumeStreakFreeze as consumePure,
  doubleXpMsRemaining as doubleXpMsRemainingPure,
  isDoubleXpActive,
  mondayOf,
  POWERUPS_DEFAULT,
  shouldUseStreakFreeze as shouldUsePure,
  xpMultiplier as xpMultiplierPure,
  ymd,
  type PowerupsState,
} from '@mochilang/shared'

const STORAGE_KEY = 'mochilang:powerups:v1'

interface UsePowerupsReturn {
  state: PowerupsState
  /** True while the 30-min Double XP window is live. */
  doubleXpActive: boolean
  /** ms remaining in the window, or 0. */
  doubleXpMsLeft: number
  /** Current XP multiplier (2 during Double XP, otherwise 1). */
  xpMultiplier: number
  canActivateDoubleXp: boolean
  canClaimStreakFreeze: boolean
  /** Convenience: should the next completion consume a freeze right now? */
  shouldUseStreakFreezeNow: (lastActiveDate: string | null) => boolean
  /** Activate the 30-min Double XP window. No-op if already used today. */
  activateDoubleXp: () => Promise<void>
  /** Claim this week's freeze. No-op if the cap is hit or already claimed. */
  claimStreakFreeze: () => Promise<void>
  /** Decrement freeze count. Call from the completion flow when bridging a gap. */
  consumeStreakFreeze: () => Promise<void>
}

async function save(s: PowerupsState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* in-memory state survives the session */
  }
}

export function usePowerups(): UsePowerupsReturn {
  const [state, setState] = useState<PowerupsState>(POWERUPS_DEFAULT)
  // Re-render every second so the countdown ticks. We only schedule the
  // interval while Double XP is active; otherwise sit idle.
  const [, setTick] = useState(0)
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hydrate from disk once on mount.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (alive && raw) {
          setState({ ...POWERUPS_DEFAULT, ...JSON.parse(raw) })
        }
      } catch {
        /* first run or corrupt blob — leave defaults in place */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Manage the countdown ticker — only active when Double XP is live.
  useEffect(() => {
    const now = Date.now()
    if (isDoubleXpActive(state, now)) {
      if (tickerRef.current === null) {
        tickerRef.current = setInterval(() => {
          setTick((n) => n + 1)
        }, 1000)
      }
    } else if (tickerRef.current !== null) {
      clearInterval(tickerRef.current)
      tickerRef.current = null
    }
    return () => {
      if (tickerRef.current !== null) {
        clearInterval(tickerRef.current)
        tickerRef.current = null
      }
    }
  }, [state.doubleXpActiveUntil, state])

  const now = Date.now()
  const today = ymd(new Date())
  const weekStart = mondayOf()

  const activateDoubleXp = useCallback(async () => {
    setState((prev) => {
      const next = activateDoubleXpPure(prev, Date.now(), ymd(new Date()))
      void save(next)
      return next
    })
  }, [])

  const claimStreakFreeze = useCallback(async () => {
    setState((prev) => {
      const next = claimPure(prev, mondayOf())
      void save(next)
      return next
    })
  }, [])

  const consumeStreakFreeze = useCallback(async () => {
    setState((prev) => {
      const next = consumePure(prev)
      void save(next)
      return next
    })
  }, [])

  return {
    state,
    doubleXpActive: isDoubleXpActive(state, now),
    doubleXpMsLeft: doubleXpMsRemainingPure(state, now),
    xpMultiplier: xpMultiplierPure(state, now),
    canActivateDoubleXp: canActivatePure(state, now, today),
    canClaimStreakFreeze: canClaimPure(state, weekStart),
    shouldUseStreakFreezeNow: (lastActiveDate) =>
      shouldUsePure(state, lastActiveDate, today),
    activateDoubleXp,
    claimStreakFreeze,
    consumeStreakFreeze,
  }
}
