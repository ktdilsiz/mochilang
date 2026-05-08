/**
 * Topic- and level-level progression rules.
 *
 * A topic is "completed" when every lesson in it has at least one
 * recorded result. To advance to the *next* topic in a level the
 * learner must either complete the current topic the long way (all
 * lessons) or pass a topic-skip exam — a randomized 20-question quiz
 * drawn from every lesson in the topic.
 *
 * To skip an entire level (e.g. A1 → A2) there's a level-skip exam:
 * 40 harder questions drawn from the *last* lesson of each topic in
 * the level, weighted toward later topics so the synthesis material
 * dominates. The pass bar is also tighter (85% vs 80%).
 *
 * Both pass-states live in their own client-side stores (see
 * useTopicExams / useLevelExams hooks per app) so they don't have to
 * round-trip through the lesson-completion API.
 */

import type { Exercise, Level, Topic } from './types'

/** Number of questions on a topic-skip exam. */
export const EXAM_QUESTION_COUNT = 20

/** Fraction of correct answers needed to pass a topic-skip exam. */
export const EXAM_PASS_THRESHOLD = 0.8

/** Number of questions on a level-skip exam — twice as many as a topic. */
export const LEVEL_EXAM_QUESTION_COUNT = 40

/**
 * Tighter bar to skip a whole level. 34/40 — the user is claiming
 * they've absorbed the entire level, so we want them to actually have.
 */
export const LEVEL_EXAM_PASS_THRESHOLD = 0.85

/**
 * Lookup of which topics have had their skip-exam passed. Stored as
 * `Record<topicId, true>` rather than a Set so the value is JSON-safe
 * for both localStorage and AsyncStorage.
 */
export type TopicExamsPassed = Record<string, true>

/** Same shape as TopicExamsPassed but keyed by level id. */
export type LevelExamsPassed = Record<string, true>

export function isTopicCompleted(
  topic: Topic,
  results: Record<string, unknown>
): boolean {
  if (topic.lessons.length === 0) return false
  return topic.lessons.every((l) => results[l.id] !== undefined)
}

/**
 * Topic-level "skip-pass" — the topic is treated as cleared if either
 * every lesson is done OR the user passed the exam.
 */
export function isTopicCleared(
  topic: Topic,
  results: Record<string, unknown>,
  examsPassed: TopicExamsPassed
): boolean {
  return examsPassed[topic.id] === true || isTopicCompleted(topic, results)
}

/**
 * Whole-level cleared rules:
 *   - the level-skip exam was passed, OR
 *   - every topic in the level is cleared (lesson-by-lesson or via
 *     topic-skip exam).
 *
 * `levelExamsPassed` is optional so older callers that don't yet track
 * level exams keep working — they'll simply never report cleared via
 * the level-skip path.
 */
export function isLevelCleared(
  level: Level,
  results: Record<string, unknown>,
  topicExamsPassed: TopicExamsPassed,
  levelExamsPassed: LevelExamsPassed = {}
): boolean {
  if (levelExamsPassed[level.id] === true) return true
  if (level.topics.length === 0) return false
  return level.topics.every((t) => isTopicCleared(t, results, topicExamsPassed))
}

/**
 * A topic is unlocked when:
 *   - its containing level's skip-exam was passed (the user opted out
 *     of the whole level — every topic inside is now reachable), OR
 *   - it's the first topic of the first level, OR
 *   - it's a non-first topic of its level and the previous topic is
 *     cleared, OR
 *   - it's the first topic of a non-first level and the previous level
 *     is cleared.
 */
export function isTopicUnlocked(
  levels: Level[],
  topicId: string,
  results: Record<string, unknown>,
  examsPassed: TopicExamsPassed,
  levelExamsPassed: LevelExamsPassed = {}
): boolean {
  for (let li = 0; li < levels.length; li++) {
    const level = levels[li]
    for (let ti = 0; ti < level.topics.length; ti++) {
      const topic = level.topics[ti]
      if (topic.id !== topicId) continue
      if (levelExamsPassed[level.id] === true) return true
      if (ti > 0) {
        return isTopicCleared(level.topics[ti - 1], results, examsPassed)
      }
      // First topic of this level — gate on the previous level.
      if (li === 0) return true
      return isLevelCleared(levels[li - 1], results, examsPassed, levelExamsPassed)
    }
  }
  // Unknown id — render rather than block. Bad data shouldn't trap users.
  return true
}

/**
 * Find the topic immediately before the given one in level order.
 * Returns null for the very first topic. Used to render lock messages
 * like "Finish [Greetings] or pass its exam to unlock".
 */
export function previousTopic(levels: Level[], topicId: string): Topic | null {
  let prev: Topic | null = null
  for (const level of levels) {
    for (const topic of level.topics) {
      if (topic.id === topicId) return prev
      prev = topic
    }
  }
  return null
}

/**
 * Pick `count` exercises uniformly at random from across all lessons in
 * the topic. Sampling is *with replacement* only when the topic has
 * fewer unique exercises than `count`, in which case duplicates fill
 * the rest — small topics still produce a 20-question exam that way
 * rather than silently truncating. The optional `rng` lets tests
 * pin the seed; in production we use Math.random.
 */
export function pickExamQuestions(
  topic: Topic,
  count: number = EXAM_QUESTION_COUNT,
  rng: () => number = Math.random
): Exercise[] {
  const all: Exercise[] = topic.lessons.flatMap((l) => l.exercises)
  if (all.length === 0) return []
  const shuffled = shuffle(all, rng)
  if (shuffled.length >= count) return shuffled.slice(0, count)
  // Topic is too small — top up by repeating the shuffled set.
  const out: Exercise[] = []
  while (out.length < count) {
    out.push(...shuffled)
  }
  return out.slice(0, count)
}

function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** True when the score crosses the topic-skip pass threshold. */
export function isExamPassed(correct: number, total: number = EXAM_QUESTION_COUNT): boolean {
  if (total === 0) return false
  return correct / total >= EXAM_PASS_THRESHOLD
}

/**
 * Pick `count` questions for a level-skip exam.
 *
 * Sampling rules per the product spec:
 *   - Source pool is the *last lesson* of each topic in the level
 *     (the synthesis lesson — typically a review of the topic).
 *   - Per-topic question budget is proportional to topic position
 *     (weight = 1-indexed position), so later topics dominate. With
 *     8 topics that's a 1:8 weight ratio between first and last.
 *   - Within a topic's last lesson we sample without replacement;
 *     if the budget exceeds the lesson size we top up by re-drawing
 *     (small lessons + heavy weighting can otherwise leave us short).
 *   - The combined deck is shuffled so questions from late topics
 *     aren't all clustered at the end.
 *
 * The exam is intentionally hard — it's a "skip the whole level"
 * shortcut, not a casual quiz. The threshold is set in
 * LEVEL_EXAM_PASS_THRESHOLD and matches that intent.
 */
export function pickLevelExamQuestions(
  level: Level,
  count: number = LEVEL_EXAM_QUESTION_COUNT,
  rng: () => number = Math.random
): Exercise[] {
  const topics = level.topics
  if (topics.length === 0) return []

  const weights = topics.map((_, i) => i + 1)
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  // Round-then-fix-up so per-topic budgets sum to exactly `count`.
  const budgets = weights.map((w) => Math.round((count * w) / totalWeight))
  const drift = count - budgets.reduce((a, b) => a + b, 0)
  if (budgets.length > 0) budgets[budgets.length - 1] += drift

  const out: Exercise[] = []
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i]
    const lastLesson = topic.lessons[topic.lessons.length - 1]
    if (!lastLesson) continue
    const want = Math.max(0, budgets[i])
    const pool = lastLesson.exercises
    if (pool.length === 0 || want === 0) continue
    const shuffled = shuffle(pool, rng)
    if (shuffled.length >= want) {
      out.push(...shuffled.slice(0, want))
      continue
    }
    out.push(...shuffled)
    for (let extra = shuffled.length; extra < want; extra++) {
      out.push(pool[Math.floor(rng() * pool.length)])
    }
  }

  return shuffle(out, rng).slice(0, count)
}

/** True when the score crosses the level-skip pass threshold. */
export function isLevelExamPassed(
  correct: number,
  total: number = LEVEL_EXAM_QUESTION_COUNT
): boolean {
  if (total === 0) return false
  return correct / total >= LEVEL_EXAM_PASS_THRESHOLD
}
