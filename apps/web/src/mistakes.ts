import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MistakeRecord, MistakesState } from '@mochilang/shared'

/**
 * Web hook tracking mistakes per course. Keyed by exerciseId at the
 * inner level, by courseId at the outer — switching courses doesn't
 * mix decks. Persisted to localStorage; no API yet (matches the
 * topic/level exam pattern).
 */

const STORAGE_KEY = 'mochilang:mistakes:v1'

type StoredShape = Record<string, MistakesState>

function loadAll(): StoredShape {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as StoredShape
  } catch {
    return {}
  }
}

function saveAll(state: StoredShape) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export interface RecordContext {
  lessonId: string
  topicId: string
  levelId: string
}

export function useMistakes(courseId: string) {
  const [all, setAll] = useState<StoredShape>(loadAll)

  // Only persist per-course slices that actually exist — keeps the
  // localStorage key from accumulating empty objects after resets.
  useEffect(() => {
    saveAll(all)
  }, [all])

  const state = useMemo<MistakesState>(() => all[courseId] ?? {}, [all, courseId])

  const record = useCallback(
    (exerciseId: string, ctx: RecordContext) => {
      setAll((prev) => {
        const prevForCourse = prev[courseId] ?? {}
        const existing = prevForCourse[exerciseId]
        const next: MistakeRecord = {
          lessonId: ctx.lessonId,
          topicId: ctx.topicId,
          levelId: ctx.levelId,
          count: (existing?.count ?? 0) + 1,
          lastFailedAt: Date.now(),
        }
        return {
          ...prev,
          [courseId]: { ...prevForCourse, [exerciseId]: next },
        }
      })
    },
    [courseId]
  )

  const resolve = useCallback(
    (exerciseId: string) => {
      setAll((prev) => {
        const prevForCourse = prev[courseId] ?? {}
        if (!(exerciseId in prevForCourse)) return prev
        const nextForCourse = { ...prevForCourse }
        delete nextForCourse[exerciseId]
        return { ...prev, [courseId]: nextForCourse }
      })
    },
    [courseId]
  )

  const resetCourse = useCallback(() => {
    setAll((prev) => {
      if (!(courseId in prev)) return prev
      const next = { ...prev }
      delete next[courseId]
      return next
    })
  }, [courseId])

  const resetAll = useCallback(() => {
    setAll({})
  }, [])

  return { state, record, resolve, resetCourse, resetAll }
}
