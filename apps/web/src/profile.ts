/**
 * Mochilang user profile + league standing — API-backed.
 *
 * Same hook surface (`state`, `setProfile`, `reset`) but the canonical store
 * is the backend. localStorage is a write-through cache so the profile
 * pill paints instantly on reload.
 *
 * The league screen used to mutate `leagueTier` and `lastWeekRank` directly;
 * those resolutions now happen server-side inside `/api/league`. The hook
 * exposes a thin `setProfile` for the (small) set of client-driven changes:
 * name + avatar + dismissing the promote/demote banner.
 */

import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, type ProfileResponse } from '@mochilang/shared'

const STORAGE_KEY = 'mochilang:profile:v1'

export interface ProfileState {
  name: string | null
  avatarId: string
  leagueTier: number
  leagueWeekStart: string | null
  lastWeekRank: number | null
  lastWeekChange: 'promoted' | 'demoted' | 'held' | null
}

const DEFAULT_STATE: ProfileState = {
  name: null,
  avatarId: 'mochi-main',
  leagueTier: 0,
  leagueWeekStart: null,
  lastWeekRank: null,
  lastWeekChange: null,
}

function fromResponse(r: ProfileResponse): ProfileState {
  return {
    name: r.name,
    avatarId: r.avatarId,
    leagueTier: r.leagueTier,
    leagueWeekStart: r.leagueWeekStart,
    lastWeekRank: r.lastWeekRank,
    lastWeekChange: r.lastWeekChange,
  }
}

function load(): ProfileState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<ProfileState>) }
  } catch {
    return DEFAULT_STATE
  }
}

function save(s: ProfileState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function useProfile() {
  const [state, setState] = useState<ProfileState>(load)

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await api.getProfile(ctrl.signal)
        const next = fromResponse(r)
        setState(next)
        save(next)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!(err instanceof ApiError)) {
          console.warn('useProfile: API offline; using cached state', err)
        } else {
          console.error('useProfile: API error', err)
        }
      }
    })()
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    save(state)
  }, [state])

  /**
   * Apply a partial profile update. Currently the client can change
   * `name`, `avatarId`, and acknowledge a promote/demote banner via
   * `lastWeekChange: null`. League-tier mutations are server-driven.
   */
  const setProfile = useCallback(async (patch: Partial<ProfileState>) => {
    // Optimistic update for snappy UI; reconciled on response.
    setState((prev) => ({ ...prev, ...patch }))

    try {
      // Banner dismissal has its own endpoint — keeps the API expressive.
      if (
        patch.lastWeekChange === null &&
        patch.name === undefined &&
        patch.avatarId === undefined
      ) {
        const r = await api.dismissBanner()
        const next = fromResponse(r)
        setState(next)
        save(next)
        return
      }
      // Name / avatar updates go to PUT /api/profile.
      const updateBody: { name?: string; avatarId?: string } = {}
      if (patch.name !== undefined && patch.name !== null) {
        updateBody.name = patch.name
      }
      if (patch.avatarId !== undefined) updateBody.avatarId = patch.avatarId
      if (Object.keys(updateBody).length === 0) return

      const r = await api.updateProfile(updateBody)
      const next = fromResponse(r)
      setState(next)
      save(next)
    } catch (err) {
      console.warn('setProfile: offline, kept optimistic local state', err)
    }
  }, [])

  const reset = useCallback(async () => {
    try {
      const r = await api.resetProfile()
      const next = fromResponse(r)
      setState(next)
      save(next)
    } catch (err) {
      console.warn('profile.reset: offline, clearing locally', err)
      setState(DEFAULT_STATE)
      save(DEFAULT_STATE)
    }
  }, [])

  return { state, setProfile, reset }
}
