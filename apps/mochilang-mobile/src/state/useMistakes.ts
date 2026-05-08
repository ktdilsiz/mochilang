import { useCallback, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MistakeRecord, MistakesState } from '@mochilang/shared'

/**
 * Mobile mirror of apps/web/src/mistakes.ts. Persists per-course
 * mistake records in AsyncStorage.
 */

const STORAGE_KEY = 'mochilang:mistakes:v1'

type StoredShape = Record<string, MistakesState>

export interface RecordContext {
  lessonId: string
  topicId: string
  levelId: string
}

export function useMistakes(courseId: string) {
  const [all, setAll] = useState<StoredShape>({})

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (!alive || !raw) return
        const parsed = JSON.parse(raw) as unknown
        if (!parsed || typeof parsed !== 'object') return
        setAll(parsed as StoredShape)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all)).catch(() => {})
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
