import { useEffect, useState } from 'react'
import type { Language, Lesson, Level, Topic } from '../types'
import type { ProgressState } from '../state'
import { iconForLesson } from '../components/lessonIcons'
import mochiThinking from '../assets/mochi-thinking.png'
import './HomeScreen.css'

interface Props {
  levels: Level[]
  language: Language | null
  progress: ProgressState
  isCompleted: (id: string) => boolean
  onSelect: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
  onSwitchLanguage: () => void
  offline?: boolean
}

export default function HomeScreen({
  levels,
  language,
  progress,
  isCompleted,
  onSelect,
  onOpenGuide,
  onSwitchLanguage,
  offline,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  // Find the global "next-up" lesson — the first uncompleted lesson when
  // scanning levels → topics → lessons in order. We track the level + topic
  // it lives in so the hero banner can advertise it accurately.
  let nextId: string | null = null
  let heroLevel: Level | null = null
  let heroTopic: Topic | null = null
  let heroTopicIndexInLevel = 0
  outer: for (const level of levels) {
    for (let t = 0; t < level.topics.length; t++) {
      const topic = level.topics[t]
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

      {levels.map((level) => {
        const showLevelHeader = levels.length > 1 || level.id !== 'a1'
        return (
          <div key={level.id} className="home-level">
            {showLevelHeader && <LevelDivider level={level} />}
            {level.topics.map((topic, topicIdx) => (
              <TopicSection
                key={topic.id}
                topic={topic}
                topicNumber={topicIdx + 1}
                openId={openId}
                setOpenId={setOpenId}
                isCompleted={isCompleted}
                nextId={nextId}
                onSelect={onSelect}
                onOpenGuide={onOpenGuide}
              />
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
 * LevelDivider — the thin "A1 — Beginner" bar between fluency tiers.
 * Suppressed when there's only one level so single-tier courses don't
 * show a meaningless header.
 */
function LevelDivider({ level }: { level: Level }) {
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
  openId: string | null
  setOpenId: (v: string | null) => void
  isCompleted: (id: string) => boolean
  nextId: string | null
  onSelect: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
}

function TopicSection({
  topic,
  topicNumber,
  openId,
  setOpenId,
  isCompleted,
  nextId,
  onSelect,
  onOpenGuide,
}: TopicSectionProps) {
  const allDone = topic.lessons.every((l) => isCompleted(l.id))
  return (
    <section className="home-topic">
      <header className="home-topic-header" data-theme={topic.theme}>
        <div className="home-topic-meta">
          <div className="home-topic-eyebrow">
            Topic {topicNumber}
            {allDone && <span className="home-topic-done">✓</span>}
          </div>
          <h3 className="home-topic-title">{topic.title}</h3>
          <p className="home-topic-desc">{topic.description}</p>
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
          const isOpen = openId === lesson.id
          const offset = Math.sin(idx * (Math.PI / 4)) * 80
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
                      : 'home-node-default')
                }
                data-theme={lesson.theme}
                onClick={() => setOpenId(isOpen ? null : lesson.id)}
                aria-label={`${lesson.title}${done ? ' (completed)' : ''}`}
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
