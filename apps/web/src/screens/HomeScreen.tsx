import { useEffect, useMemo, useState } from 'react'
import type {
  LanguageInfo,
  Lesson,
  Level,
  LevelExamsPassed,
  Topic,
  TopicExamsPassed,
} from '@mochilang/shared'
import {
  isLevelCleared,
  isTopicCleared,
  isTopicUnlocked,
  previousTopic,
} from '@mochilang/shared'
import type { ProgressState } from '../state'
import { iconForLesson } from '../components/lessonIcons'
import mochiThinking from '../assets/mochi-thinking.png'
import './HomeScreen.css'

interface Props {
  levels: Level[]
  language: LanguageInfo | null
  progress: ProgressState
  examsPassed: TopicExamsPassed
  levelExamsPassed: LevelExamsPassed
  isCompleted: (id: string) => boolean
  onSelect: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
  onTakeExam: (topic: Topic) => void
  onTakeLevelExam: (level: Level) => void
  onSwitchLanguage: () => void
  offline?: boolean
}

export default function HomeScreen({
  levels,
  language,
  progress,
  examsPassed,
  levelExamsPassed,
  isCompleted,
  onSelect,
  onOpenGuide,
  onTakeExam,
  onTakeLevelExam,
  onSwitchLanguage,
  offline,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  // Flat reference for prereq lookups — turning topic ids into topic
  // objects so we can show "Complete <Title> first" when a prereq isn't
  // met. Built once per render over the full level list.
  const allTopics: Topic[] = levels.flatMap((l) => l.topics)

  // Cumulative lesson index where each topic starts, reset at level
  // boundaries. Drives the sine-wave offset on the lesson path so the
  // snake keeps its phase across topic headers instead of restarting
  // at center on every topic. Reset at level dividers so each level
  // begins the snake fresh.
  const lessonStartIndices = useMemo(() => {
    const map = new Map<string, number>()
    for (const level of levels) {
      let cumulative = 0
      for (const topic of level.topics) {
        map.set(topic.id, cumulative)
        cumulative += topic.lessons.length
      }
    }
    return map
  }, [levels])

  // Find the global "next-up" lesson — the first uncompleted lesson in
  // an unlocked topic when scanning levels → topics → lessons in order.
  // Locked topics are skipped so the hero never advertises a lesson the
  // user can't open.
  let nextId: string | null = null
  let heroLevel: Level | null = null
  let heroTopic: Topic | null = null
  let heroTopicIndexInLevel = 0
  outer: for (const level of levels) {
    for (let t = 0; t < level.topics.length; t++) {
      const topic = level.topics[t]
      if (
        !isTopicUnlocked(levels, topic.id, progress.results, examsPassed, levelExamsPassed)
      ) {
        continue
      }
      for (const lesson of topic.lessons) {
        if (!isCompleted(lesson.id)) {
          nextId = lesson.id
          heroLevel = level
          heroTopic = topic
          heroTopicIndexInLevel = t
          break outer
        }
      }
    }
  }
  // If everything is completed, point at the very last topic.
  if (heroTopic === null && levels.length > 0) {
    const lastLevel = levels[levels.length - 1]
    if (lastLevel.topics.length > 0) {
      heroLevel = lastLevel
      heroTopic = lastLevel.topics[lastLevel.topics.length - 1]
      heroTopicIndexInLevel = lastLevel.topics.length - 1
    }
  }

  useEffect(() => {
    function close(e: PointerEvent) {
      const target = e.target as Element | null
      if (target?.closest?.('[data-lesson]')) return
      setOpenId(null)
    }
    window.addEventListener('pointerdown', close, true)
    return () => window.removeEventListener('pointerdown', close, true)
  }, [])

  return (
    <div className="home-shell">
      <header className="home-topbar">
        <button
          type="button"
          className="home-lang-pill"
          onClick={onSwitchLanguage}
          aria-label="Switch language"
        >
          <span className="home-lang-flag">{language?.flag}</span>
          <span className="home-lang-name">{language?.name ?? 'Pick course'}</span>
          <span className="home-lang-chev">▾</span>
        </button>

        <div className="home-stats">
          {offline && (
            <span className="home-stat home-stat-offline" title="Local-only mode">
              📴 Offline
            </span>
          )}
          <span className="home-stat home-stat-streak" title="Streak">
            🔥 <span>{progress.streak}</span>
          </span>
          <span className="home-stat home-stat-xp" title="Total XP">
            ⚡ <span>{progress.totalXp}</span>
          </span>
        </div>
      </header>

      {heroTopic && heroLevel && (
        <section className="home-hero card">
          <img src={mochiThinking} alt="" className="home-hero-mochi" />
          <div className="home-hero-text">
            <div className="home-hero-eyebrow">
              {heroLevel.name} · Topic {heroTopicIndexInLevel + 1} of{' '}
              {heroLevel.topics.length}
            </div>
            <h2 className="home-hero-title">{heroTopic.title}</h2>
            <p className="home-hero-body">{heroTopic.description}</p>
          </div>
        </section>
      )}

      {levels.map((level, levelIdx) => {
        const showLevelHeader = levels.length > 1 || level.id !== 'a1'
        const groups = groupConsecutiveByTheme(level.topics)
        const levelDone = isLevelCleared(
          level,
          progress.results,
          examsPassed,
          levelExamsPassed
        )
        const levelExamPassed = levelExamsPassed[level.id] === true
        // Show the level-skip exam offer when the user can actually start
        // the level (its prerequisite level is cleared or it's the first
        // level), there's enough material to test against (≥2 topics), and
        // the level isn't already finished.
        const prevLevelCleared =
          levelIdx === 0 ||
          isLevelCleared(
            levels[levelIdx - 1],
            progress.results,
            examsPassed,
            levelExamsPassed
          )
        const showLevelExam =
          prevLevelCleared && level.topics.length >= 2 && !levelDone
        return (
          <div key={level.id} className="home-level">
            {showLevelHeader && (
              <LevelDivider
                level={level}
                showExam={showLevelExam}
                examPassed={levelExamPassed}
                onTakeExam={onTakeLevelExam}
              />
            )}
            {groups.map((group, gi) => (
              <div key={`${level.id}-grp-${gi}`} className="home-subgroup">
                {group.length >= 2 && (
                  <SubThemeDivider theme={group[0].topic.theme} />
                )}
                {group.map(({ topic, topicNumber }) => {
                  const unlocked = isTopicUnlocked(
                    levels,
                    topic.id,
                    progress.results,
                    examsPassed,
                    levelExamsPassed
                  )
                  const cleared = isTopicCleared(topic, progress.results, examsPassed)
                  const examPassed = examsPassed[topic.id] === true
                  const prereqReason = unlocked
                    ? computeLockReason(topic, allTopics, isCompleted)
                    : null
                  const hardLockReason = unlocked
                    ? null
                    : describeHardLock(levels, topic.id)
                  return (
                    <TopicSection
                      key={topic.id}
                      topic={topic}
                      topicNumber={topicNumber}
                      lessonStartIdx={lessonStartIndices.get(topic.id) ?? 0}
                      openId={openId}
                      setOpenId={setOpenId}
                      isCompleted={isCompleted}
                      nextId={nextId}
                      hardLockReason={hardLockReason}
                      softLockReason={prereqReason}
                      cleared={cleared}
                      examPassed={examPassed}
                      onSelect={onSelect}
                      onOpenGuide={onOpenGuide}
                      onTakeExam={onTakeExam}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        )
      })}

      {levels.length === 0 && (
        <div className="home-empty">
          <img src={mochiThinking} alt="" className="home-empty-mochi" />
          <h3>No lessons yet</h3>
          <p>This course is being built. Try a different language for now.</p>
        </div>
      )}
    </div>
  )
}

/**
 * Describes why a topic is hard-locked: the previous topic isn't done
 * and its skip-exam isn't passed. Returns a human-readable label that
 * names the previous topic, or null when there's no previous topic
 * (which would be a logic error elsewhere).
 */
function describeHardLock(levels: Level[], topicId: string): string | null {
  const prev = previousTopic(levels, topicId)
  if (!prev) return null
  return `Finish ${prev.title} or pass its exam to unlock`
}

/**
 * computeLockReason walks the topic's `prerequisites` array and returns
 * a human label like "Complete Greetings & Numbers first" if any prereq
 * topic still has incomplete lessons. Returns null when the topic is
 * either prereq-free or all prereqs are done.
 *
 * Soft lock — the topic still renders and is tappable. The reason just
 * surfaces in the topic header so the learner knows what to brush up on.
 */
function computeLockReason(
  topic: Topic,
  allTopics: Topic[],
  isCompleted: (id: string) => boolean
): string | null {
  if (!topic.prerequisites || topic.prerequisites.length === 0) return null
  const unmet: string[] = []
  for (const prereqId of topic.prerequisites) {
    const prereq = allTopics.find((t) => t.id === prereqId)
    if (!prereq) continue // Unknown id — silently skip rather than block
    const allDone = prereq.lessons.every((l) => isCompleted(l.id))
    if (!allDone) unmet.push(prereq.title)
  }
  if (unmet.length === 0) return null
  if (unmet.length === 1) return `Complete ${unmet[0]} first`
  if (unmet.length === 2) return `Complete ${unmet[0]} and ${unmet[1]} first`
  return `Complete ${unmet.slice(0, -1).join(', ')} and ${unmet[unmet.length - 1]} first`
}

/**
 * groupConsecutiveByTheme partitions a level's topics into runs of
 * adjacent same-theme topics. Each entry preserves the original 1-indexed
 * topic number so per-level "Topic N" labels stay continuous regardless
 * of the new sub-grouping.
 */
function groupConsecutiveByTheme(
  topics: Topic[]
): { topic: Topic; topicNumber: number }[][] {
  const groups: { topic: Topic; topicNumber: number }[][] = []
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i]
    const last = groups[groups.length - 1]
    if (last && last[last.length - 1].topic.theme === t.theme) {
      last.push({ topic: t, topicNumber: i + 1 })
    } else {
      groups.push([{ topic: t, topicNumber: i + 1 }])
    }
  }
  return groups
}

/** Per-theme display label for the sub-divider. Falls back to the raw
 * theme id (which is human-readable) if no friendlier label exists. */
const THEME_LABELS: Record<string, string> = {
  greetings: 'Greetings & social',
  numbers: 'Numbers & quantity',
  basics: 'Foundations',
  family: 'People & family',
  verbs: 'Actions',
  food: 'Food & drink',
  location: 'Places',
  time: 'Time',
  questions: 'Questions',
  directions: 'Directions',
  colors: 'Colors',
  weather: 'Weather',
  review: 'Review',
}

function SubThemeDivider({ theme }: { theme: string }) {
  const label = THEME_LABELS[theme] ?? theme
  return (
    <div className="home-subtheme-divider">
      <span className="home-subtheme-label">{label}</span>
    </div>
  )
}

/**
 * LevelDivider — the thin "A1 — Beginner" bar between fluency tiers.
 * Suppressed when there's only one level so single-tier courses don't
 * show a meaningless header. The optional skip-exam button rides on
 * the right so the offer is visible without scrolling deep into the
 * topic list.
 */
function LevelDivider({
  level,
  showExam,
  examPassed,
  onTakeExam,
}: {
  level: Level
  showExam: boolean
  examPassed: boolean
  onTakeExam: (level: Level) => void
}) {
  return (
    <div className="home-level-divider">
      <div className="home-level-divider-line" />
      <div className="home-level-divider-pill">
        <span className="home-level-divider-id">{level.id.toUpperCase()}</span>
        <span className="home-level-divider-name">
          {stripIdPrefix(level.name, level.id)}
        </span>
      </div>
      <div className="home-level-divider-line" />
      {showExam && (
        <button
          type="button"
          className="home-level-exam"
          onClick={() => onTakeExam(level)}
          aria-label={`Take ${level.name} skip exam`}
        >
          📝 {examPassed ? 'Retake level exam' : 'Skip level exam'}
        </button>
      )}
    </div>
  )
}

// "A1 — Beginner" → "Beginner" (since the pill already shows the id)
function stripIdPrefix(name: string, id: string): string {
  const upper = id.toUpperCase()
  if (name.startsWith(upper)) {
    return name.replace(/^[A-Z0-9]+\s*[—\-:·]\s*/, '').trim()
  }
  return name
}

interface TopicSectionProps {
  topic: Topic
  topicNumber: number
  /**
   * Cumulative lesson index this topic starts at within its level.
   * Drives the sine-wave snake so the phase carries over from the
   * previous topic instead of restarting at zero.
   */
  lessonStartIdx: number
  openId: string | null
  setOpenId: (v: string | null) => void
  isCompleted: (id: string) => boolean
  nextId: string | null
  /** Hard-lock label — set when the previous topic isn't cleared. */
  hardLockReason: string | null
  /** Soft-lock label from `prerequisites`, when prereqs aren't met. */
  softLockReason: string | null
  /** True when every lesson is done OR the skip-exam was passed. */
  cleared: boolean
  /** True when the user has passed this topic's skip exam. */
  examPassed: boolean
  onSelect: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
  onTakeExam: (topic: Topic) => void
}

function TopicSection({
  topic,
  topicNumber,
  lessonStartIdx,
  openId,
  setOpenId,
  isCompleted,
  nextId,
  hardLockReason,
  softLockReason,
  cleared,
  examPassed,
  onSelect,
  onOpenGuide,
  onTakeExam,
}: TopicSectionProps) {
  const allDone = topic.lessons.every((l) => isCompleted(l.id))
  const isLocked = hardLockReason !== null
  const showExamButton = !isLocked && !allDone && topic.lessons.length >= 2
  return (
    <section
      className={
        'home-topic' +
        (softLockReason ? ' home-topic-locked' : '') +
        (isLocked ? ' home-topic-hardlocked' : '')
      }
    >
      <header className="home-topic-header" data-theme={topic.theme}>
        <div className="home-topic-meta">
          <div className="home-topic-eyebrow">
            Topic {topicNumber}
            {(cleared || allDone) && <span className="home-topic-done">✓</span>}
            {examPassed && !allDone && (
              <span className="home-topic-exam-tag">Exam passed</span>
            )}
          </div>
          <h3 className="home-topic-title">{topic.title}</h3>
          <p className="home-topic-desc">{topic.description}</p>
          {hardLockReason && (
            <div className="home-topic-hardlock">🔒 {hardLockReason}</div>
          )}
          {!hardLockReason && softLockReason && (
            <div className="home-topic-lock">🔒 {softLockReason}</div>
          )}
        </div>
        <div className="home-topic-actions">
          {topic.guide && (
            <button
              type="button"
              className="home-topic-notes"
              onClick={() => onOpenGuide(topic)}
              aria-label={`Open notes for ${topic.title}`}
            >
              📖 <span>Notes</span>
            </button>
          )}
          {showExamButton && (
            <button
              type="button"
              className="home-topic-exam"
              onClick={() => onTakeExam(topic)}
              aria-label={`Take ${topic.title} skip exam`}
            >
              📝 <span>{examPassed ? 'Retake exam' : 'Skip exam'}</span>
            </button>
          )}
          <div className="home-topic-progress">
            {topic.lessons.filter((l) => isCompleted(l.id)).length} /{' '}
            {topic.lessons.length}
          </div>
        </div>
      </header>

      <div className="home-path">
        {topic.lessons.map((lesson, idx) => {
          const done = isCompleted(lesson.id)
          const isNext = lesson.id === nextId
          const isOpen = openId === lesson.id && !isLocked
          const offset = Math.sin((lessonStartIdx + idx) * (Math.PI / 4)) * 80
          return (
            <div
              key={lesson.id}
              className={'home-path-row ' + (isOpen ? 'home-path-row-open' : '')}
              style={{ ['--offset' as never]: `${offset}px` }}
              data-lesson={lesson.id}
            >
              <button
                type="button"
                className={
                  'home-node ' +
                  (done
                    ? 'home-node-done'
                    : isNext
                      ? 'home-node-next'
                      : isLocked
                        ? 'home-node-locked'
                        : 'home-node-default')
                }
                data-theme={lesson.theme}
                disabled={isLocked}
                onClick={() => !isLocked && setOpenId(isOpen ? null : lesson.id)}
                aria-label={`${lesson.title}${done ? ' (completed)' : ''}${
                  isLocked ? ' (locked)' : ''
                }`}
              >
                {iconForLesson(lesson, { completed: done })}
                {isNext && !done && <span className="home-node-pulse" />}
              </button>

              {isOpen && (
                <div
                  className="home-popover card"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="home-pop-eyebrow">
                    {done ? 'Completed' : isNext ? 'Up next' : 'Locked-in path'}
                  </div>
                  <div className="home-pop-title">{lesson.title}</div>
                  <p className="home-pop-body">{lesson.description}</p>
                  <div className="home-pop-meta">
                    <span className="home-pill">⚡ {lesson.xp} XP</span>
                    <span className="home-pill">
                      {lesson.exercises.length} exercises
                    </span>
                  </div>
                  <button
                    type="button"
                    className={
                      'ledge-button ' +
                      (done ? 'tone-success' : 'tone-primary') +
                      ' size-lg home-pop-btn'
                    }
                    onClick={() => {
                      setOpenId(null)
                      onSelect(lesson)
                    }}
                  >
                    {done ? 'Practice again' : 'Start'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
