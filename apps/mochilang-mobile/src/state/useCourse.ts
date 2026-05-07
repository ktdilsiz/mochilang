import { useEffect, useState } from 'react'
import { api, ApiError, type Level } from '@mochilang/shared'

interface CourseEnvelope {
  id: string
  levels: Level[]
}

/**
 * RN equivalent of the web `useCourse` hook. The mobile app doesn't
 * bundle the course JSON yet (Phase 2 — would use Metro's `require`),
 * so today it's API-only with an empty initial state. Backend offline
 * = no levels render until it comes back. Acceptable for the Phase 1
 * preview; we'll add a bundled fallback once the rest of the screens
 * are ported.
 */
export function useCourse(courseId: string) {
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await api.getCourse<CourseEnvelope>(courseId, ctrl.signal)
        if (r.id !== courseId) {
          throw new Error(`API returned course ${r.id}, expected ${courseId}`)
        }
        setLevels(r.levels)
        setStale(false)
      } catch (err) {
        if (err instanceof ApiError) {
          // 4xx — empty state
          return
        }
        // Network failure — flag stale, keep empty for now
        setStale(true)
      } finally {
        setLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [courseId])

  return { levels, loading, stale }
}
