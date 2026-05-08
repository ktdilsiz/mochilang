import { useEffect, useState } from 'react'
import { api, ApiError, type Level } from '@mochilang/shared'
import { COURSE_BUNDLES, type CourseEnvelope } from '../data/courseBundles'

/**
 * Mobile useCourse — bundled JSON fallback + API refresh.
 *
 * Metro inlines bundled course JSON at build time (see
 * src/data/courseBundles.ts) so the app has full curriculum on first
 * launch without any network round-trip. The effect then re-fetches
 * `/api/content/courses/:id` to pick up any server-side updates; on
 * failure we silently keep the bundled copy.
 */
const BUNDLE: Record<string, CourseEnvelope> = COURSE_BUNDLES

function levelsFromBundle(courseId: string): Level[] {
  return BUNDLE[courseId]?.levels ?? []
}

export function useCourse(courseId: string) {
  const [levels, setLevels] = useState<Level[]>(() => levelsFromBundle(courseId))
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
          // 4xx — bundle is the source of truth, keep it.
          return
        }
        // Network failure — flag stale so the UI can show "offline" hint.
        setStale(true)
      } finally {
        setLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [courseId])

  return { levels, loading, stale }
}
