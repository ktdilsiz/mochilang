import { useCallback, useEffect, useState } from 'react'
import type { LevelExamsPassed } from '@mochilang/shared'

/**
 * Web hook tracking which level-skip exams the user has passed. Same
 * shape and persistence model as useTopicExams, just keyed by level
 * id (a1, a2, …) instead of topic id.
 */

const STORAGE_KEY = 'mochilang:levelExams:v1'

function load(): LevelExamsPassed {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: LevelExamsPassed = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === true) out[k] = true
    }
    return out
  } catch {
    return {}
  }
}

function save(state: LevelExamsPassed) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function useLevelExams() {
  const [state, setState] = useState<LevelExamsPassed>(load)

  useEffect(() => {
    save(state)
  }, [state])

  const pass = useCallback((levelId: string) => {
    setState((prev) => ({ ...prev, [levelId]: true as const }))
  }, [])

  const reset = useCallback(() => {
    setState({})
  }, [])

  return { state, pass, reset }
}
