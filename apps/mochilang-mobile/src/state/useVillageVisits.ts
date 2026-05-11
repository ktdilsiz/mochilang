/**
 * Tracks which mochies are currently in the village.
 *
 * Two sources combine:
 *   - Daily window — pure function of (mochiIndex, now), see
 *     villageSchedule.ts.
 *   - Invitations — user-triggered 10-minute visits, persisted in
 *     AsyncStorage so they survive a relaunch.
 *
 * A 15-second ticker re-evaluates "now" so windows flip in and out
 * without the user needing to navigate away.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MOCHI_ROSTER_SIZE } from '@mochilang/shared'
import { isVisitingNow } from '../data/villageSchedule'

const STORAGE_KEY = 'mochilang:villageInvitations:v1'
export const INVITE_DURATION_MS = 10 * 60_000
const TICK_INTERVAL_MS = 15_000

export interface Invitation {
  index: number
  expiresAt: number
}

interface PersistedState {
  invitations?: Invitation[]
}

export interface VillageVisits {
  /** Indices of mochies currently in the village. */
  visiting: Set<number>
  /** Active invitations (not yet expired). */
  invitations: Invitation[]
  /** Drop an invitation; the mochi shows up immediately for 10 min. */
  invite: (index: number) => void
  isInvited: (index: number) => boolean
  /** ms until this index's invitation expires; null if none. */
  invitationMsRemaining: (index: number) => number | null
  /** Treat "now" as this timestamp; ticks every 15s. */
  now: number
}

export function useVillageVisits(): VillageVisits {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [hydrated, setHydrated] = useState(false)

  // Hydrate persisted invitations.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (alive && raw) {
          const parsed = JSON.parse(raw) as PersistedState
          if (Array.isArray(parsed.invitations)) {
            const cutoff = Date.now()
            setInvitations(
              parsed.invitations.filter(
                (i) => typeof i.index === 'number' && i.expiresAt > cutoff,
              ),
            )
          }
        }
      } catch {
        /* first launch / corrupted blob; start empty */
      } finally {
        if (alive) setHydrated(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Persist after hydration so first-mount empty state doesn't blow
  // away anything we haven't loaded yet.
  useEffect(() => {
    if (!hydrated) return
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ invitations }),
    ).catch(() => {})
  }, [invitations, hydrated])

  // Ticker keeps the visiting set fresh as windows open/close and
  // invitations expire. 15s is fine-grained enough for UI feedback
  // without burning battery.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Lazy garbage collection of expired invitations.
  useEffect(() => {
    setInvitations((prev) => {
      const fresh = prev.filter((i) => i.expiresAt > now)
      return fresh.length === prev.length ? prev : fresh
    })
  }, [now])

  const invite = useCallback((index: number) => {
    const expiresAt = Date.now() + INVITE_DURATION_MS
    setInvitations((prev) => {
      const others = prev.filter((i) => i.index !== index)
      return [...others, { index, expiresAt }]
    })
  }, [])

  const visiting = useMemo(() => {
    const set = new Set<number>()
    const nowDate = new Date(now)
    for (let i = 0; i < MOCHI_ROSTER_SIZE; i++) {
      if (isVisitingNow(i, nowDate)) set.add(i)
    }
    for (const inv of invitations) {
      if (inv.expiresAt > now) set.add(inv.index)
    }
    return set
  }, [invitations, now])

  const isInvited = useCallback(
    (index: number) => invitations.some((i) => i.index === index && i.expiresAt > now),
    [invitations, now],
  )

  const invitationMsRemaining = useCallback(
    (index: number) => {
      const found = invitations.find((i) => i.index === index)
      if (!found) return null
      const remaining = found.expiresAt - now
      return remaining > 0 ? remaining : null
    },
    [invitations, now],
  )

  return {
    visiting,
    invitations,
    invite,
    isInvited,
    invitationMsRemaining,
    now,
  }
}
