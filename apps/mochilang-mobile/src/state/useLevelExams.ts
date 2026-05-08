import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { LevelExamsPassed } from '@mochilang/shared'

/**
 * Mobile mirror of apps/web/src/levelExams.ts. Tracks which level-skip
 * exams the user has passed.
 */

const STORAGE_KEY = 'mochilang:levelExams:v1'

export function useLevelExams() {
  const [state, setState] = useState<LevelExamsPassed>({})

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (!alive || !raw) return
        const parsed = JSON.parse(raw) as unknown
        if (!parsed || typeof parsed !== 'object') return
        const out: LevelExamsPassed = {}
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (v === true) out[k] = true
        }
        setState(out)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {})
  }, [state])

  const pass = useCallback((levelId: string) => {
    setState((prev) => ({ ...prev, [levelId]: true as const }))
  }, [])

  const reset = useCallback(() => {
    setState({})
  }, [])

  return { state, pass, reset }
}
