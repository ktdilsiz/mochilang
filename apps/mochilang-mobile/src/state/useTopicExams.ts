import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { TopicExamsPassed } from '@mochilang/shared'

/**
 * Mobile mirror of apps/web/src/topicExams.ts. Tracks which topic-skip
 * exams the user has passed in AsyncStorage. Client-only — no API
 * round-trip yet.
 */

const STORAGE_KEY = 'mochilang:topicExams:v1'

export function useTopicExams() {
  const [state, setState] = useState<TopicExamsPassed>({})

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (!alive || !raw) return
        const parsed = JSON.parse(raw) as unknown
        if (!parsed || typeof parsed !== 'object') return
        const out: TopicExamsPassed = {}
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

  const pass = useCallback((topicId: string) => {
    setState((prev) => ({ ...prev, [topicId]: true as const }))
  }, [])

  const reset = useCallback(() => {
    setState({})
  }, [])

  return { state, pass, reset }
}
