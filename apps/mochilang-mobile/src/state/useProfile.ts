/**
 * Mochilang user profile + league standing — RN port.
 *
 * Mirrors apps/web/src/profile.ts but uses AsyncStorage instead of
 * localStorage. Same hook surface (`state`, `setProfile`, `reset`) so
 * the screens that consume it can be platform-shared.
 */

import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  api,
  ApiError,
  PROFILE_DEFAULT,
  type ProfileResponse,
  type ProfileState,
} from '@mochilang/shared'

const STORAGE_KEY = 'mochilang:profile:v1'

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

async function save(s: ProfileState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function useProfile() {
  const [state, setState] = useState<ProfileState>(PROFILE_DEFAULT)

  useEffect(() => {
    let alive = true
    const ctrl = new AbortController()
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (alive && raw) {
          setState({ ...PROFILE_DEFAULT, ...JSON.parse(raw) })
        }
      } catch {
        /* ignore */
      }
      try {
        const r = await api.getProfile(ctrl.signal)
        if (!alive) return
        const next = fromResponse(r)
        setState(next)
        void save(next)
      } catch {
        // Network/CORS — keep cached state. ApiError 4xx also keeps cached.
      }
    })()
    return () => {
      alive = false
      ctrl.abort()
    }
  }, [])

  const setProfile = useCallback(async (patch: Partial<ProfileState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      void save(next)
      return next
    })

    try {
      // Banner dismissal has its own endpoint.
      if (
        patch.lastWeekChange === null &&
        patch.name === undefined &&
        patch.avatarId === undefined
      ) {
        const r = await api.dismissBanner()
        const next = fromResponse(r)
        setState(next)
        void save(next)
        return
      }
      const updateBody: { name?: string; avatarId?: string } = {}
      if (patch.name !== undefined && patch.name !== null) {
        updateBody.name = patch.name
      }
      if (patch.avatarId !== undefined) updateBody.avatarId = patch.avatarId
      if (Object.keys(updateBody).length === 0) return

      const r = await api.updateProfile(updateBody)
      const next = fromResponse(r)
      setState(next)
      void save(next)
    } catch {
      // Offline — kept the optimistic state.
    }
  }, [])

  const reset = useCallback(async () => {
    try {
      const r = await api.resetProfile()
      const next = fromResponse(r)
      setState(next)
      void save(next)
    } catch {
      setState(PROFILE_DEFAULT)
      void save(PROFILE_DEFAULT)
    }
  }, [])

  return { state, setProfile, reset }
}
