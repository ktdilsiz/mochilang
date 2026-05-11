import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Per-mochi user overrides on top of the hand-curated VILLAGE_POSITIONS
 * defaults. Anything absent here falls back to the default; anything
 * present (x/y coords or `hidden` flag) wins.
 *
 * Persisted locally only — switching devices loses placements. A
 * server-side sync layer can land later by populating the same shape
 * via /api/profile or a new endpoint.
 */
export interface PlacementOverride {
  /** Normalized x in [0, 1]. */
  x?: number
  /** Normalized y in [0, 1]. */
  y?: number
  /** When true, the sprite skips rendering on the panorama. */
  hidden?: boolean
}

export type PlacementOverrides = Record<number, PlacementOverride>

const STORAGE_KEY = 'mochilang:villagePlacements:v1'

export function useVillagePlacements() {
  const [overrides, setOverrides] = useState<PlacementOverrides>({})

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (!alive || !raw) return
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setOverrides(parsed as PlacementOverrides)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)).catch(
      () => {}
    )
  }, [overrides])

  const move = useCallback((index: number, x: number, y: number) => {
    setOverrides((prev) => ({
      ...prev,
      [index]: { ...prev[index], x, y },
    }))
  }, [])

  const hide = useCallback((index: number) => {
    setOverrides((prev) => ({
      ...prev,
      [index]: { ...prev[index], hidden: true },
    }))
  }, [])

  const unhide = useCallback((index: number) => {
    setOverrides((prev) => ({
      ...prev,
      [index]: { ...prev[index], hidden: false },
    }))
  }, [])

  const resetOne = useCallback((index: number) => {
    setOverrides((prev) => {
      if (!(index in prev)) return prev
      const next = { ...prev }
      delete next[index]
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setOverrides({})
  }, [])

  return { overrides, move, hide, unhide, resetOne, resetAll }
}
