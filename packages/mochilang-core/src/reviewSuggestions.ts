/**
 * Cross-level review traversal.
 *
 * Walks a learner's progress and surfaces lessons completed long enough ago
 * that they're due for a refresher. The picker is intentionally simple:
 * any lesson with a result older than `staleAfterDays` is a candidate;
 * we sort by oldest first and return the top N. No fancy spaced-repetition
 * scheduler — just "you finished this two weeks ago, want to revisit?"
 *
 * The function is pure and React-free so it can also be unit-tested or
 * called from a future cron / preload step.
 */

import type { Lesson, Level } from './types'
import type { LessonResult } from './stateTypes'

export interface ReviewSuggestion {
  lesson: Lesson
  topicId: string
  topicTitle: string
  levelId: string
  /** Unix-ms timestamp of the last completion. */
  lastAt: number
  /** Days since last completion, rounded down. Useful for the "X days ago" copy. */
  daysAgo: number
}

interface PickOpts {
  staleAfterDays?: number
  /** Maximum number of suggestions to return. */
  limit?: number
  /** Wall-clock time, defaulted to now() — kept overridable for tests. */
  now?: number
}

const DEFAULT_STALE_DAYS = 7
const DEFAULT_LIMIT = 5
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Returns up to `limit` lessons from `levels` that have been completed
 * (per `results`) at least `staleAfterDays` ago, oldest first.
 */
export function pickReviewSuggestions(
  levels: Level[],
  results: Record<string, LessonResult>,
  opts: PickOpts = {}
): ReviewSuggestion[] {
  const now = opts.now ?? Date.now()
  const staleMs = (opts.staleAfterDays ?? DEFAULT_STALE_DAYS) * MS_PER_DAY
  const limit = opts.limit ?? DEFAULT_LIMIT

  const candidates: ReviewSuggestion[] = []
  for (const level of levels) {
    for (const topic of level.topics) {
      for (const lesson of topic.lessons) {
        const result = results[lesson.id]
        if (!result) continue
        const age = now - result.lastAt
        if (age < staleMs) continue
        candidates.push({
          lesson,
          topicId: topic.id,
          topicTitle: topic.title,
          levelId: level.id,
          lastAt: result.lastAt,
          daysAgo: Math.floor(age / MS_PER_DAY),
        })
      }
    }
  }

  candidates.sort((a, b) => a.lastAt - b.lastAt)
  return candidates.slice(0, limit)
}
