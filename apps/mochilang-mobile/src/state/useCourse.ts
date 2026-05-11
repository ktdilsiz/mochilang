import { useEffect, useState } from 'react'
import {
  api,
  ApiError,
  communityLessonId,
  type CommunityPack,
  type Level,
} from '@mochilang/shared'
import { COURSE_BUNDLES, type CourseEnvelope } from '../data/courseBundles'

/**
 * Mobile useCourse — bundled JSON fallback + API refresh.
 *
 * Metro inlines bundled course JSON at build time (see
 * src/data/courseBundles.ts) so the app has full curriculum on first
 * launch without any network round-trip. The effect then re-fetches
 * `/api/content/courses/:id` to pick up any server-side updates; on
 * failure we silently keep the bundled copy.
 *
 * Community packs use the `community:<packId>` courseId scheme — they
 * don't ship in the bundle so the initial state is empty until the
 * fetch lands. Lesson ids inside community packs are namespaced
 * (`c/<packId>/<lessonId>`) so completions don't collide with canonical
 * lessons in `lesson_results`.
 */
const BUNDLE: Record<string, CourseEnvelope> = COURSE_BUNDLES

const COMMUNITY_PREFIX = 'community:'

function levelsFromBundle(courseId: string): Level[] {
  return BUNDLE[courseId]?.levels ?? []
}

/**
 * Rewrites lesson ids inside a community pack level with a `c/<packId>/`
 * prefix so progress, mistakes, and review state don't conflict with
 * canonical lesson ids that happen to share the same string.
 */
function namespaceCommunityLevel(packId: string, level: Level): Level {
  return {
    ...level,
    topics: level.topics.map((t) => ({
      ...t,
      lessons: t.lessons.map((l) => ({
        ...l,
        id: communityLessonId(packId, l.id),
      })),
    })),
  }
}

export function useCourse(courseId: string) {
  const isCommunity = courseId.startsWith(COMMUNITY_PREFIX)

  const [levels, setLevels] = useState<Level[]>(() =>
    isCommunity ? [] : levelsFromBundle(courseId)
  )
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        if (isCommunity) {
          const packId = courseId.slice(COMMUNITY_PREFIX.length)
          const pack: CommunityPack = await api.community.get(packId, ctrl.signal)
          setLevels([namespaceCommunityLevel(packId, pack.level)])
          setStale(false)
        } else {
          const r = await api.getCourse<CourseEnvelope>(courseId, ctrl.signal)
          if (r.id !== courseId) {
            throw new Error(`API returned course ${r.id}, expected ${courseId}`)
          }
          setLevels(r.levels)
          setStale(false)
        }
      } catch (err) {
        if (err instanceof ApiError) {
          // 4xx — bundle is the source of truth, keep it. For community
          // packs there's no bundle, so the empty initial state stays.
          return
        }
        // Network failure — flag stale so the UI can show "offline" hint.
        setStale(true)
      } finally {
        setLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [courseId, isCommunity])

  return { levels, loading, stale }
}
