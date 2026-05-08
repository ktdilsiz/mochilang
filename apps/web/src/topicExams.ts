import { useCallback, useEffect, useState } from 'react'
import type { TopicExamsPassed } from '@mochilang/shared'

/**
 * Web hook tracking which topic-skip exams the user has passed.
 *
 * Persists locally only — the API doesn't have a topic-exam endpoint
 * yet, so we keep this client-side. If the user clears their browser
 * data they'll have to re-pass exams (or just complete the lessons),
 * which matches how lesson progress also degrades on a fresh device
 * before the API has hydrated it.
 */

const STORAGE_KEY = 'mochilang:topicExams:v1'

function load(): TopicExamsPassed {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: TopicExamsPassed = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === true) out[k] = true
    }
    return out
  } catch {
    return {}
  }
}

function save(state: TopicExamsPassed) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function useTopicExams() {
  const [state, setState] = useState<TopicExamsPassed>(load)

  useEffect(() => {
    save(state)
  }, [state])

  const pass = useCallback((topicId: string) => {
    setState((prev) => ({ ...prev, [topicId]: true as const }))
  }, [])

  const reset = useCallback(() => {
    setState({})
  }, [])

  return { state, pass, reset }
}
