/**
 * Course content loader.
 *
 * Curriculum is owned by the backend: each level is a JSON file under
 * apps/api/internal/content/data/<course>/<level>.json (e.g.
 * `zh-en/a1.json`). The backend assembles them into a single payload
 * served by /api/content/courses/:id; cmd/genfallbacks publishes the
 * same wire payload into apps/web/src/data/generated/course-<id>.json
 * for offline use.
 *
 * The hook below tries the API first (fresh content) and falls back to
 * the bundled copy on any error. Both online and offline paths return
 * the same shape, so screens don't have to care.
 *
 * The exported types come from the same shape both sides agree on; we
 * cast the parsed JSON to `Level[]` since the JSON shape is the contract
 * (any drift would surface in the LessonScreen as a render error rather
 * than a TypeScript error — accepted tradeoff for content-authoring
 * speed on the API side).
 */

import { useEffect, useMemo, useState } from 'react'
import { coursesFallback } from './generated'
import { api, ApiError } from '@mochilang/shared'
import type { Level, Topic } from '@mochilang/shared'

interface CourseEnvelope {
  id: string
  levels: Level[]
}

export function useCourse(courseId: string) {
  const [levels, setLevels] = useState<Level[]>(() => levelsFromFallback(courseId))
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false) // true when API failed and we're showing the bundle

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
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!(err instanceof ApiError)) {
          console.warn('useCourse: API offline; using bundled course', err)
        }
        setStale(true)
      } finally {
        setLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [courseId])

  // Most existing UI walks topics flat. Provide both: the structured
  // `levels` array for level-aware screens, and a flat `topics` array
  // (with `levelId` annotated) for everything else.
  const topics = useMemo<Topic[]>(
    () => levels.flatMap((l) => l.topics),
    [levels]
  )

  return { levels, topics, loading, stale }
}

function levelsFromFallback(courseId: string): Level[] {
  const raw = (coursesFallback as Record<string, unknown>)[courseId]
  if (!raw || typeof raw !== 'object') return []
  const env = raw as { levels?: Level[] }
  return env.levels ?? []
}
