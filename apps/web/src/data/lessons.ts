/**
 * Course content loader.
 *
 * Curriculum is owned by the backend now: canonical JSON at
 * apps/api/internal/content/data/zh-en.json, served via /api/content/
 * courses/zh-en, and bundled into apps/web/src/data/generated/
 * course-zh-en.json as offline fallback. The hook below tries the API
 * first and falls back to the bundle if anything goes wrong.
 *
 * The exported types come from the same shape both sides agree on; we
 * cast the parsed JSON to `Topic[]` since the JSON shape is the contract
 * (any drift would surface in the LessonScreen as a render error rather
 * than a TypeScript error — accepted tradeoff for content authoring
 * speed on the API side).
 */

import { useEffect, useState } from 'react'
import { coursesFallback } from './generated'
import { api, ApiError } from '../lib/api'
import type { Topic } from '../types'

interface CourseEnvelope {
  id: string
  topics: Topic[]
}

export function useCourse(courseId: string) {
  const [topics, setTopics] = useState<Topic[]>(() => topicsFromFallback(courseId))
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
        setTopics(r.topics)
        setStale(false)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        // ApiError or network failure → stay on the bundled fallback.
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

  return { topics, loading, stale }
}

function topicsFromFallback(courseId: string): Topic[] {
  const raw = (coursesFallback as Record<string, unknown>)[courseId]
  if (!raw || typeof raw !== 'object') return []
  const env = raw as { topics?: Topic[] }
  return env.topics ?? []
}
