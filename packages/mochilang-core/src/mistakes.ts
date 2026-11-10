/**
 * Mistake tracking — every time the user gets an exercise wrong (in a
 * lesson or an exam), we remember it. Later they can re-drill those
 * specific exercises via "Practice mistakes" at lesson, topic, or
 * level scope.
 *
 * The data is purely client-side for now (no API endpoint), per the
 * same pattern as topic/level exam passes. Stored as
 * `Record<exerciseId, MistakeRecord>` per courseId so switching
 * languages doesn't mix mistake decks.
 *
 * Resolution: when a user practices a previously-failed exercise and
 * gets it right, we delete its record. Drilling again until it sticks
 * is the whole point.
 */

import type { Exercise, Lesson, Level, Topic } from './types'

export interface MistakeRecord {
  /** Lesson the exercise belongs to. */
  lessonId: string
  /** Topic the lesson is in. */
  topicId: string
  /** Level the topic is in. */
  levelId: string
  /** Total times this exercise has been failed (incremented per fail). */
  count: number
  /** Most recent failure (ms epoch) — used for ordering / decay later. */
  lastFailedAt: number
}

/** exerciseId → MistakeRecord. Independent per course. */
export type MistakesState = Record<string, MistakeRecord>

/** Distinct exercise ids that fall inside a lesson. */
export function mistakesForLesson(
  lessonId: string,
  state: MistakesState
): string[] {
  const out: string[] = []
  for (const [id, m] of Object.entries(state)) {
    if (m.lessonId === lessonId) out.push(id)
  }
  return out
}

/** Distinct exercise ids that fall inside a topic. */
export function mistakesForTopic(
  topicId: string,
  state: MistakesState
): string[] {
  const out: string[] = []
  for (const [id, m] of Object.entries(state)) {
    if (m.topicId === topicId) out.push(id)
  }
  return out
}

/** Distinct exercise ids that fall inside a level. */
export function mistakesForLevel(
  levelId: string,
  state: MistakesState
): string[] {
  const out: string[] = []
  for (const [id, m] of Object.entries(state)) {
    if (m.levelId === levelId) out.push(id)
  }
  return out
}

/** Total count of distinct mistakes across the whole course. */
export function totalMistakes(state: MistakesState): number {
  return Object.keys(state).length
}

/**
 * Build a fast lookup map: exerciseId → { exercise, lesson, topic, level }.
 * Walks the entire course once, callers can then resolve lots of ids
 * in O(1). Cheap to rebuild — courses are small enough.
 */
export function buildExerciseIndex(
  levels: Level[]
): Map<string, { exercise: Exercise; lesson: Lesson; topic: Topic; level: Level }> {
  const map = new Map<
    string,
    { exercise: Exercise; lesson: Lesson; topic: Topic; level: Level }
  >()
  for (const level of levels) {
    for (const topic of level.topics) {
      for (const lesson of topic.lessons) {
        for (const exercise of lesson.exercises) {
          map.set(exercise.id, { exercise, lesson, topic, level })
        }
      }
    }
  }
  return map
}

/**
 * Resolve a set of exercise ids into the actual Exercise objects.
 * Missing ids (e.g. content was edited after the mistake was recorded)
 * are silently dropped — better than crashing the practice screen.
 */
export function collectMistakeExercises(
  levels: Level[],
  exerciseIds: string[]
): Exercise[] {
  const index = buildExerciseIndex(levels)
  const out: Exercise[] = []
  for (const id of exerciseIds) {
    const entry = index.get(id)
    if (entry) out.push(entry.exercise)
  }
  return out
}

/**
 * Look up the lesson/topic/level context for an exercise. Used when
 * recording a fresh mistake from a synthesized exam deck — the deck
 * has Exercise objects but not their parent context.
 */
export function locateExercise(
  levels: Level[],
  exerciseId: string
):
  | { exercise: Exercise; lesson: Lesson; topic: Topic; level: Level }
  | null {
  for (const level of levels) {
    for (const topic of level.topics) {
      for (const lesson of topic.lessons) {
        for (const exercise of lesson.exercises) {
          if (exercise.id === exerciseId) {
            return { exercise, lesson, topic, level }
          }
        }
      }
    }
  }
  return null
}
