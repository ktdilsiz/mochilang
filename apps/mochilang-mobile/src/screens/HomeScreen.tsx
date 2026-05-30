import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type {
  Lesson,
  Level,
  LevelExamsPassed,
  MistakesState,
  Topic,
  TopicExamsPassed,
} from '@mochilang/shared'
import {
  isLevelCleared,
  isTopicCleared,
  isTopicUnlocked,
  mistakesForLesson,
  mistakesForLevel,
  mistakesForTopic,
  previousTopic,
} from '@mochilang/shared'
import { useProgress } from '../state/useProgress'
import { useCourse } from '../state/useCourse'
import { useSettings } from '../state/useSettings'
import LedgeButton from '../components/LedgeButton'
import LessonNode from '../components/LessonNode'
import { colors, fontSizes, radius, space, tintForTheme } from '../lib/theme'

interface Props {
  courseId: string
  /** Shared progress state from the App-level hook — passing as a
   * prop instead of calling useProgress() locally so HomeScreen sees
   * the same state container that LessonScreen writes to. */
  progress: ReturnType<typeof useProgress>
  examsPassed: TopicExamsPassed
  levelExamsPassed: LevelExamsPassed
  mistakes: MistakesState
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
  onTakeExam: (topic: Topic) => void
  onTakeLevelExam: (level: Level) => void
  onPracticeLesson: (lesson: Lesson) => void
  onPracticeTopic: (topic: Topic) => void
  onPracticeLevel: (level: Level) => void
  /** Dev-mode shortcuts — only surfaced when settings.developerMode. */
  onDevCompleteLesson: (lesson: Lesson) => void
  onDevCompleteTopic: (topic: Topic) => void
  onDevCompleteLevel: (level: Level) => void
}

/**
 * Approximate height of the lesson popover card (eyebrow + title + body
 * + meta pills + button). Used to decide flip-above vs flip-below and
 * to pick a scroll offset that keeps the whole card on screen.
 */
const POPOVER_HEIGHT = 280
const POPOVER_GAP = 8 // vertical gap between node and popover

/**
 * HomeScreen — themed topic banners + winding lesson path with circular
 * nodes (sin-wave horizontal offset, matches web). Tapping a node opens
 * a popover card; we auto-scroll the path so the popover stays visible
 * (and flip above when the node is near the screen bottom).
 */
export default function HomeScreen({
  courseId,
  progress,
  examsPassed,
  levelExamsPassed,
  mistakes,
  onSelectLesson,
  onOpenGuide,
  onTakeExam,
  onTakeLevelExam,
  onPracticeLesson,
  onPracticeTopic,
  onPracticeLevel,
  onDevCompleteLesson,
  onDevCompleteTopic,
  onDevCompleteLevel,
}: Props) {
  const insets = useSafeAreaInsets()
  const course = useCourse(courseId)
  const { state: settings } = useSettings()
  const devMode = settings.developerMode
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)
  const [popoverPlacement, setPopoverPlacement] = useState<'below' | 'above'>(
    'below'
  )

  // Collapse/expand state for levels and topics. Default: only the
  // current (next-to-do) level and topic are expanded; everything else
  // is collapsed. User toggles persist for the session only.
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(
    () => new Set(),
  )
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(
    () => new Set(),
  )

  function toggleLevel(id: string) {
    setOpenLessonId(null)
    setExpandedLevels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTopic(id: string) {
    setOpenLessonId(null)
    setExpandedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const scrollRef = useRef<ScrollView>(null)
  // Each lesson row registers its View ref here so we can measure where
  // it sits inside the ScrollView when a popover opens. Stored as a map
  // (not state) since it only matters at press time.
  const rowRefs = useRef<Record<string, View | null>>({})

  const isCompleted = (id: string) => !!progress.state.results[id]

  // Cumulative lesson index where each topic starts, reset at level
  // boundaries. Used by the lesson-path sine offset so the snake keeps
  // its phase across topic headers instead of resetting at every topic.
  const lessonStartIndices = useMemo(() => {
    const map = new Map<string, number>()
    for (const level of course.levels) {
      let cumulative = 0
      for (const topic of level.topics) {
        map.set(topic.id, cumulative)
        cumulative += topic.lessons.length
      }
    }
    return map
  }, [course.levels])

  function handleNodePress(lessonId: string) {
    if (openLessonId === lessonId) {
      setOpenLessonId(null)
      return
    }

    const row = rowRefs.current[lessonId]
    const sv = scrollRef.current
    if (!row || !sv) {
      // Fallback — open below without scrolling. Shouldn't happen since
      // refs are wired in render, but keeps the UI usable if anything
      // about the layout is mid-flight.
      setPopoverPlacement('below')
      setOpenLessonId(lessonId)
      return
    }

    // measureInWindow gives us the node's y relative to the screen, so we
    // can decide flip-above vs flip-below independently of how far down
    // the ScrollView we are. We'll then scroll only if the popover would
    // hang off the bottom or top.
    row.measureInWindow((_x, pageY, _w, _h) => {
      const screenH = Dimensions.get('window').height
      // Reserve ~80px for the bottom tab bar + a little breathing room.
      const safeBottom = screenH - 80

      const nodeBottom = pageY + 88 /* node height */
      const wouldFitBelow =
        nodeBottom + POPOVER_GAP + POPOVER_HEIGHT < safeBottom

      const placement: 'below' | 'above' = wouldFitBelow ? 'below' : 'above'
      setPopoverPlacement(placement)
      setOpenLessonId(lessonId)

      // Decide if we should scroll to make the popover visible. Even
      // when placing above, the popover top can be cut off near the
      // top of the viewport; when placing below, the bottom can be cut
      // off if the screen is short. Either way, we want the whole node
      // + popover area to be within the safe area.
      const popoverTop =
        placement === 'below'
          ? nodeBottom + POPOVER_GAP
          : pageY - POPOVER_GAP - POPOVER_HEIGHT
      const popoverBottom = popoverTop + POPOVER_HEIGHT
      const safeTop = 80 // topbar + status

      let dy = 0
      if (popoverBottom > safeBottom) {
        dy = popoverBottom - safeBottom + 16 // 16px padding past edge
      } else if (popoverTop < safeTop) {
        dy = popoverTop - safeTop - 16 // negative => scroll up
      }

      if (dy !== 0) {
        // We don't have direct access to the current scrollY — but
        // scrollTo with `y: <delta>` doesn't work. Use scrollResponder's
        // legacy API isn't worth it; instead use a relative scrollBy via
        // scrollTo + the captured currentScroll. We track current scroll
        // via the scroll event below.
        sv.scrollTo({
          y: Math.max(0, currentScrollY.current + dy),
          animated: true,
        })
      }
    })
  }

  // Kept up to date by onScroll. Used by handleNodePress to compute a
  // relative scroll target without needing measureLayout against the
  // ScrollView (which is fiddlier and varies by RN version).
  const currentScrollY = useRef(0)

  // Find the next-up lesson + the topic/level that contains it for the
  // hero card. Skips locked topics so the hero never advertises a
  // lesson the user can't open.
  const heroInfo = useMemo(() => {
    let nextId: string | null = null
    let heroLevel: Level | null = null
    let heroTopic: Topic | null = null
    let heroTopicIndex = 0
    outer: for (const level of course.levels) {
      for (let t = 0; t < level.topics.length; t++) {
        const topic = level.topics[t]
        if (
          !devMode &&
          !isTopicUnlocked(
            course.levels,
            topic.id,
            progress.state.results,
            examsPassed,
            levelExamsPassed
          )
        ) {
          continue
        }
        for (const lesson of topic.lessons) {
          if (!isCompleted(lesson.id)) {
            nextId = lesson.id
            heroLevel = level
            heroTopic = topic
            heroTopicIndex = t
            break outer
          }
        }
      }
    }
    if (heroTopic === null && course.levels.length > 0) {
      const last = course.levels[course.levels.length - 1]
      if (last.topics.length > 0) {
        heroLevel = last
        heroTopic = last.topics[last.topics.length - 1]
        heroTopicIndex = last.topics.length - 1
      }
    }
    return { nextId, heroLevel, heroTopic, heroTopicIndex }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.levels, progress.state.results, examsPassed, levelExamsPassed, devMode])

  // Auto-expand the current level + topic on first sight of them.
  // Adding to the set rather than replacing means manually-expanded
  // siblings stay open as the user progresses.
  const heroLevelId = heroInfo.heroLevel?.id ?? null
  const heroTopicId = heroInfo.heroTopic?.id ?? null
  useEffect(() => {
    if (heroLevelId) {
      setExpandedLevels((prev) =>
        prev.has(heroLevelId) ? prev : new Set([...prev, heroLevelId]),
      )
    }
    if (heroTopicId) {
      setExpandedTopics((prev) =>
        prev.has(heroTopicId) ? prev : new Set([...prev, heroTopicId]),
      )
    }
  }, [heroLevelId, heroTopicId])

  if (course.loading && course.levels.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary500} />
        <Text style={styles.dim}>Loading your course…</Text>
      </View>
    )
  }

  if (course.levels.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>
          {course.stale
            ? "Couldn't reach the course server — check your network."
            : 'No course content yet.'}
        </Text>
      </View>
    )
  }

  const { nextId, heroLevel, heroTopic, heroTopicIndex } = heroInfo

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.shell}
      onScrollBeginDrag={() => setOpenLessonId(null)}
      onScroll={(e) => {
        currentScrollY.current = e.nativeEvent.contentOffset.y
      }}
      // 60fps tracking is overkill — we only read the value on a tap.
      scrollEventThrottle={64}
    >
      <View style={[styles.topbar, { paddingTop: insets.top + space.xs }]}>
        <Text style={styles.langName}>Chinese</Text>
        <View style={styles.stats}>
          <Stat label="🔥" value={String(progress.state.streak)} />
          <Stat label="⚡" value={String(progress.state.totalXp)} />
        </View>
      </View>

      {heroTopic && heroLevel && (
        <LinearGradient
          colors={[colors.cream100, colors.cream50]}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>
            {heroLevel.name} · Topic {heroTopicIndex + 1} of{' '}
            {heroLevel.topics.length}
          </Text>
          <Text style={styles.heroTitle}>{heroTopic.title}</Text>
          <Text style={styles.heroDesc}>{heroTopic.description}</Text>
        </LinearGradient>
      )}

      {course.levels.map((level, levelIdx) => {
        const levelDone = isLevelCleared(
          level,
          progress.state.results,
          examsPassed,
          levelExamsPassed
        )
        const prevLevelCleared =
          levelIdx === 0 ||
          isLevelCleared(
            course.levels[levelIdx - 1],
            progress.state.results,
            examsPassed,
            levelExamsPassed
          )
        const showLevelExam =
          prevLevelCleared && level.topics.length >= 2 && !levelDone
        const levelExamPassed = levelExamsPassed[level.id] === true
        return (
          <LevelSection
            key={level.id}
            level={level}
            allLevels={course.levels}
            devMode={devMode}
            progressResults={progress.state.results}
            examsPassed={examsPassed}
            levelExamsPassed={levelExamsPassed}
            showLevelExam={showLevelExam}
            levelExamPassed={levelExamPassed}
            lessonStartIndices={lessonStartIndices}
            mistakes={mistakes}
            isCompleted={isCompleted}
            nextId={nextId}
            openLessonId={openLessonId}
            popoverPlacement={popoverPlacement}
            rowRefs={rowRefs}
            expanded={expandedLevels.has(level.id)}
            expandedTopics={expandedTopics}
            onToggle={() => toggleLevel(level.id)}
            onToggleTopic={toggleTopic}
            onSelectLesson={onSelectLesson}
            onOpenGuide={onOpenGuide}
            onTakeExam={onTakeExam}
            onTakeLevelExam={onTakeLevelExam}
            onPracticeLesson={onPracticeLesson}
            onPracticeTopic={onPracticeTopic}
            onPracticeLevel={onPracticeLevel}
            onDevCompleteLesson={onDevCompleteLesson}
            onDevCompleteTopic={onDevCompleteTopic}
            onDevCompleteLevel={onDevCompleteLevel}
            onNodePress={handleNodePress}
            onCloseLesson={() => setOpenLessonId(null)}
          />
        )
      })}
    </ScrollView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

interface SectionProps {
  level: Level
  allLevels: Level[]
  /** Developer override: when true, all topics render as unlocked. */
  devMode: boolean
  progressResults: Record<string, unknown>
  examsPassed: TopicExamsPassed
  levelExamsPassed: LevelExamsPassed
  showLevelExam: boolean
  levelExamPassed: boolean
  /** Cumulative lesson index per topic id, scoped to this level. */
  lessonStartIndices: Map<string, number>
  mistakes: MistakesState
  isCompleted: (id: string) => boolean
  nextId: string | null
  openLessonId: string | null
  popoverPlacement: 'below' | 'above'
  rowRefs: React.MutableRefObject<Record<string, View | null>>
  expanded: boolean
  expandedTopics: Set<string>
  onToggle: () => void
  onToggleTopic: (id: string) => void
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
  onTakeExam: (topic: Topic) => void
  onTakeLevelExam: (level: Level) => void
  onPracticeLesson: (lesson: Lesson) => void
  onPracticeTopic: (topic: Topic) => void
  onPracticeLevel: (level: Level) => void
  onDevCompleteLesson: (lesson: Lesson) => void
  onDevCompleteTopic: (topic: Topic) => void
  onDevCompleteLevel: (level: Level) => void
  onNodePress: (lessonId: string) => void
  onCloseLesson: () => void
}

function LevelSection({
  level,
  allLevels,
  devMode,
  progressResults,
  examsPassed,
  levelExamsPassed,
  showLevelExam,
  levelExamPassed,
  lessonStartIndices,
  mistakes,
  isCompleted,
  nextId,
  openLessonId,
  popoverPlacement,
  rowRefs,
  expanded,
  expandedTopics,
  onToggle,
  onToggleTopic,
  onSelectLesson,
  onOpenGuide,
  onTakeExam,
  onTakeLevelExam,
  onPracticeLesson,
  onPracticeTopic,
  onPracticeLevel,
  onDevCompleteLesson,
  onDevCompleteTopic,
  onDevCompleteLevel,
  onNodePress,
  onCloseLesson,
}: SectionProps) {
  const levelMistakeCount = mistakesForLevel(level.id, mistakes).length
  // Same trick at the level: bump this level above its siblings when one
  // of its lessons has the popover open, so the popover can overlay the
  // next level's divider/topic banner.
  const levelHasOpen =
    openLessonId !== null &&
    level.topics.some((t) => t.lessons.some((l) => l.id === openLessonId))

  // Summary counts for the collapsed divider.
  const totalTopics = level.topics.length
  const clearedTopics = level.topics.filter((t) =>
    isTopicCleared(t, progressResults, examsPassed),
  ).length

  return (
    <View style={[styles.level, levelHasOpen && styles.levelOpen]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.levelDivider,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${level.name}`}
      >
        <View style={styles.dividerLine} />
        <Text style={styles.levelPill}>
          {expanded ? '▾' : '▸'} {level.name} · {clearedTopics}/{totalTopics}
        </Text>
        <View style={styles.dividerLine} />
      </Pressable>
      {expanded && showLevelExam && (
        <Pressable
          onPress={() => onTakeLevelExam(level)}
          style={({ pressed }) => [
            styles.levelExamBtn,
            pressed && { transform: [{ translateY: 1 }] },
          ]}
        >
          <Text style={styles.levelExamBtnText}>
            📝 {levelExamPassed ? 'Retake level exam' : `Skip ${level.id.toUpperCase()} — level exam`}
          </Text>
        </Pressable>
      )}
      {expanded && levelMistakeCount > 0 && (
        <Pressable
          onPress={() => onPracticeLevel(level)}
          style={({ pressed }) => [
            styles.levelPracticeBtn,
            pressed && { transform: [{ translateY: 1 }] },
          ]}
        >
          <Text style={styles.levelPracticeBtnText}>
            🎯 Practice {level.id.toUpperCase()} mistakes ({levelMistakeCount})
          </Text>
        </Pressable>
      )}
      {expanded && devMode && (
        <Pressable
          onPress={() => onDevCompleteLevel(level)}
          style={({ pressed }) => [
            styles.devBtn,
            pressed && { transform: [{ translateY: 1 }] },
          ]}
        >
          <Text style={styles.devBtnText}>
            🛠 Dev: complete {level.id.toUpperCase()}
          </Text>
        </Pressable>
      )}
      {expanded &&
        level.topics.map((topic, ti) => {
          const unlocked =
            devMode ||
            isTopicUnlocked(
              allLevels,
              topic.id,
              progressResults,
              examsPassed,
              levelExamsPassed
            )
          const cleared = isTopicCleared(topic, progressResults, examsPassed)
          const examPassed = examsPassed[topic.id] === true
          const prev = unlocked ? null : previousTopic(allLevels, topic.id)
          return (
            <TopicCard
              key={topic.id}
              topic={topic}
              topicNumber={ti + 1}
              lessonStartIdx={lessonStartIndices.get(topic.id) ?? 0}
              unlocked={unlocked}
              cleared={cleared}
              examPassed={examPassed}
              previousTopic={prev}
              mistakes={mistakes}
              isCompleted={isCompleted}
              nextId={nextId}
              openLessonId={openLessonId}
              popoverPlacement={popoverPlacement}
              rowRefs={rowRefs}
              expanded={expandedTopics.has(topic.id)}
              onToggle={() => onToggleTopic(topic.id)}
              devMode={devMode}
              onSelectLesson={onSelectLesson}
              onOpenGuide={onOpenGuide}
              onTakeExam={onTakeExam}
              onPracticeLesson={onPracticeLesson}
              onPracticeTopic={onPracticeTopic}
              onDevCompleteLesson={onDevCompleteLesson}
              onDevCompleteTopic={onDevCompleteTopic}
              onNodePress={onNodePress}
              onCloseLesson={onCloseLesson}
            />
          )
        })}
    </View>
  )
}

interface TopicProps {
  topic: Topic
  topicNumber: number
  /** Cumulative lesson index this topic starts at within its level. */
  lessonStartIdx: number
  unlocked: boolean
  cleared: boolean
  examPassed: boolean
  previousTopic: Topic | null
  mistakes: MistakesState
  isCompleted: (id: string) => boolean
  nextId: string | null
  openLessonId: string | null
  popoverPlacement: 'below' | 'above'
  rowRefs: React.MutableRefObject<Record<string, View | null>>
  expanded: boolean
  onToggle: () => void
  devMode: boolean
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
  onTakeExam: (topic: Topic) => void
  onPracticeLesson: (lesson: Lesson) => void
  onPracticeTopic: (topic: Topic) => void
  onDevCompleteLesson: (lesson: Lesson) => void
  onDevCompleteTopic: (topic: Topic) => void
  onNodePress: (lessonId: string) => void
  onCloseLesson: () => void
}

function TopicCard({
  topic,
  topicNumber,
  lessonStartIdx,
  unlocked,
  cleared,
  examPassed,
  previousTopic: prevTopic,
  mistakes,
  isCompleted,
  nextId,
  openLessonId,
  popoverPlacement,
  rowRefs,
  expanded,
  onToggle,
  devMode,
  onSelectLesson,
  onOpenGuide,
  onTakeExam,
  onPracticeLesson,
  onPracticeTopic,
  onDevCompleteLesson,
  onDevCompleteTopic,
  onNodePress,
  onCloseLesson,
}: TopicProps) {
  const topicMistakeCount = mistakesForTopic(topic.id, mistakes).length
  const tint = tintForTheme(topic.theme)
  const allDone = topic.lessons.every((l) => isCompleted(l.id))
  const completed = topic.lessons.filter((l) => isCompleted(l.id)).length
  // When a popover is open in this topic, bump the *whole topic* above
  // sibling topics (and sibling level sections) so the card overlays the
  // next topic's banner instead of being painted under it. zIndex only
  // orders siblings within the same parent, so we have to bump at every
  // level the popover wants to escape.
  const topicHasOpen = openLessonId !== null && topic.lessons.some((l) => l.id === openLessonId)
  const showExamButton = unlocked && !allDone && topic.lessons.length >= 2

  return (
    <View
      style={[
        styles.topic,
        topicHasOpen && styles.topicOpen,
        !unlocked && styles.topicLocked,
      ]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${topic.title}`}
        style={({ pressed }) => [
          styles.topicHeader,
          {
            backgroundColor: tint.bg,
            borderColor: tint.edge,
            borderBottomColor: tint.edgeDeep,
          },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.topicHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.topicEyebrowRow}>
              <Text style={[styles.topicEyebrow, { color: tint.fg }]}>
                {expanded ? '▾' : '▸'} Topic {topicNumber}
              </Text>
              {(cleared || allDone) && <Text style={styles.topicDone}>✓</Text>}
              {examPassed && !allDone && (
                <Text style={styles.topicExamTag}>Exam passed</Text>
              )}
            </View>
            <Text style={[styles.topicTitle, { color: tint.fg }]}>
              {topic.title}
            </Text>
            <Text style={[styles.topicDesc, { color: tint.fg }]}>
              {topic.description}
            </Text>
            {!unlocked && prevTopic && (
              <View style={styles.lockBadge}>
                <Text style={styles.lockBadgeText}>
                  🔒 Finish {prevTopic.title} or pass its exam
                </Text>
              </View>
            )}
          </View>
          <View style={styles.topicActions}>
            {topic.guide && (
              <Pressable
                onPress={() => onOpenGuide(topic)}
                style={({ pressed }) => [
                  styles.notesBtn,
                  { borderColor: tint.fg },
                  pressed && { transform: [{ translateY: 1 }] },
                ]}
              >
                <Text style={[styles.notesBtnText, { color: tint.fg }]}>
                  📖 Notes
                </Text>
              </Pressable>
            )}
            {showExamButton && (
              <Pressable
                onPress={() => onTakeExam(topic)}
                style={({ pressed }) => [
                  styles.notesBtn,
                  { borderColor: tint.fg },
                  pressed && { transform: [{ translateY: 1 }] },
                ]}
              >
                <Text style={[styles.notesBtnText, { color: tint.fg }]}>
                  📝 {examPassed ? 'Retake' : 'Skip exam'}
                </Text>
              </Pressable>
            )}
            {topicMistakeCount > 0 && (
              <Pressable
                onPress={() => onPracticeTopic(topic)}
                style={({ pressed }) => [
                  styles.notesBtn,
                  styles.notesBtnDanger,
                  pressed && { transform: [{ translateY: 1 }] },
                ]}
              >
                <Text style={styles.notesBtnDangerText}>
                  🎯 Mistakes ({topicMistakeCount})
                </Text>
              </Pressable>
            )}
            {devMode && !allDone && (
              <Pressable
                onPress={() => onDevCompleteTopic(topic)}
                style={({ pressed }) => [
                  styles.devBtn,
                  pressed && { transform: [{ translateY: 1 }] },
                ]}
              >
                <Text style={styles.devBtnText}>🛠 Dev: topic</Text>
              </Pressable>
            )}
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>
                {completed} / {topic.lessons.length}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {expanded && <View style={styles.path}>
        {topic.lessons.map((lesson, idx) => {
          const offset = Math.sin((lessonStartIdx + idx) * (Math.PI / 4)) * 80
          const isOpen = openLessonId === lesson.id
          return (
            <View
              key={lesson.id}
              // Row View ref is captured so we can `measureInWindow` from
              // the press handler — that's how we decide flip-above vs
              // flip-below and trigger an auto-scroll.
              ref={(r) => {
                rowRefs.current[lesson.id] = r
              }}
              // The transform on every row creates a stacking context, so
              // the open popover would otherwise be buried behind later
              // siblings. Bump the open row's zIndex/elevation so the
              // popover overlays everything below.
              style={[
                styles.pathRow,
                { transform: [{ translateX: offset }] },
                isOpen && styles.pathRowOpen,
              ]}
            >
              <LessonNode
                lesson={lesson}
                topicTheme={topic.theme}
                done={isCompleted(lesson.id)}
                isNext={lesson.id === nextId}
                onPress={() => unlocked && onNodePress(lesson.id)}
                locked={!unlocked}
              />
              {isOpen && unlocked && (
                <LessonPopover
                  lesson={lesson}
                  done={isCompleted(lesson.id)}
                  isNext={lesson.id === nextId}
                  placement={popoverPlacement}
                  mistakeCount={mistakesForLesson(lesson.id, mistakes).length}
                  devMode={devMode}
                  onStart={() => {
                    onCloseLesson()
                    onSelectLesson(lesson)
                  }}
                  onPracticeMistakes={() => {
                    onCloseLesson()
                    onPracticeLesson(lesson)
                  }}
                  onDevComplete={() => {
                    onCloseLesson()
                    onDevCompleteLesson(lesson)
                  }}
                  rowOffset={offset}
                />
              )}
            </View>
          )
        })}
      </View>}
    </View>
  )
}

function LessonPopover({
  lesson,
  done,
  isNext,
  placement,
  mistakeCount,
  devMode,
  onStart,
  onPracticeMistakes,
  onDevComplete,
  rowOffset,
}: {
  lesson: Lesson
  done: boolean
  isNext: boolean
  placement: 'below' | 'above'
  mistakeCount: number
  devMode: boolean
  onStart: () => void
  onPracticeMistakes: () => void
  onDevComplete: () => void
  rowOffset: number
}) {
  return (
    <View
      style={[
        styles.popover,
        placement === 'below' ? styles.popoverBelow : styles.popoverAbove,
        { transform: [{ translateX: -rowOffset }] },
      ]}
    >
      <Text style={styles.popoverEyebrow}>
        {done ? 'Completed' : isNext ? 'Up next' : 'Locked-in path'}
      </Text>
      <Text style={styles.popoverTitle}>{lesson.title}</Text>
      <Text style={styles.popoverBody}>{lesson.description}</Text>
      <View style={styles.popoverMeta}>
        <Text style={styles.popoverPill}>⚡ {lesson.xp} XP</Text>
        <Text style={styles.popoverPill}>
          {lesson.exercises.length} exercises
        </Text>
      </View>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        <LedgeButton
          label={done ? 'Practice again' : 'Start'}
          tone={done ? 'success' : 'primary'}
          size="lg"
          onPress={onStart}
        />
        {mistakeCount > 0 && (
          <LedgeButton
            label={`🎯 Practice mistakes (${mistakeCount})`}
            tone="neutral"
            onPress={onPracticeMistakes}
          />
        )}
        {devMode && !done && (
          <LedgeButton
            label="🛠 Dev: mark complete"
            tone="neutral"
            onPress={onDevComplete}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
    backgroundColor: colors.bg,
  },
  dim: { color: colors.textMuted, textAlign: 'center' },

  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langName: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  statLabel: { fontSize: fontSizes.md },
  statValue: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },

  hero: {
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.cream200,
  },
  heroEyebrow: {
    fontSize: fontSizes.xs,
    color: colors.primary700,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Nunito_900Black',
  },
  heroTitle: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    marginTop: 4,
    fontFamily: 'Nunito_900Black',
  },
  heroDesc: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 4,
    fontFamily: 'Nunito_600SemiBold',
  },

  level: { gap: space.md, position: 'relative', zIndex: 1 },
  levelOpen: { zIndex: 30, elevation: 30 },
  levelDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  levelPill: {
    fontSize: fontSizes.xs,
    color: colors.primary700,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Nunito_900Black',
  },
  levelExamBtn: {
    alignSelf: 'center',
    backgroundColor: colors.primary100,
    borderColor: colors.primary500,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: space.sm,
  },
  levelExamBtnText: {
    color: colors.primary700,
    fontSize: fontSizes.sm,
    fontFamily: 'Nunito_900Black',
  },
  levelPracticeBtn: {
    alignSelf: 'center',
    backgroundColor: colors.error100,
    borderColor: colors.error500,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: space.sm,
  },
  levelPracticeBtnText: {
    color: colors.error700,
    fontSize: fontSizes.sm,
    fontFamily: 'Nunito_900Black',
  },
  devBtn: {
    alignSelf: 'center',
    backgroundColor: '#fff8e0',
    borderColor: '#d49a13',
    borderWidth: 2,
    borderBottomWidth: 3,
    borderStyle: 'dashed',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  devBtnText: {
    color: '#8a5e00',
    fontSize: fontSizes.xs,
    fontFamily: 'Nunito_900Black',
  },

  // `position: 'relative'` is required by RN-Web for zIndex to map to a
  // CSS stacking context; native RN respects zIndex on plain Views, so
  // it's a no-op there.
  topic: { gap: space.sm, position: 'relative', zIndex: 1 },
  topicOpen: { zIndex: 30, elevation: 30 },
  topicLocked: { opacity: 0.6 },
  topicHeader: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: space.md,
    borderBottomWidth: 4,
  },
  topicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  topicEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicEyebrow: {
    fontSize: fontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Nunito_900Black',
  },
  topicDone: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: colors.success500,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontFamily: 'Nunito_900Black',
  },
  topicExamTag: {
    fontSize: 10,
    color: colors.success700,
    backgroundColor: colors.success100,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontFamily: 'Nunito_900Black',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lockBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  lockBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Nunito_700Bold',
    color: colors.text,
  },
  topicTitle: {
    fontSize: fontSizes.xl,
    marginTop: 2,
    fontFamily: 'Nunito_900Black',
  },
  topicDesc: {
    fontSize: fontSizes.sm,
    marginTop: 2,
    fontFamily: 'Nunito_600SemiBold',
  },
  topicActions: { gap: 6, alignItems: 'flex-end' },
  notesBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  notesBtnText: {
    fontSize: fontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Nunito_900Black',
  },
  notesBtnDanger: {
    backgroundColor: colors.error100,
    borderColor: colors.error500,
  },
  notesBtnDangerText: {
    fontSize: fontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Nunito_900Black',
    color: colors.error700,
  },
  progressPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  progressPillText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },

  // Winding path — sin-wave horizontal offsets give the lesson nodes a
  // gentle "S" curve, matching the web implementation.
  path: {
    alignItems: 'center',
    paddingVertical: space.lg,
    gap: 30,
    // Allow popovers to extend beyond the row's natural height without
    // pushing later rows down.
    overflow: 'visible',
  },
  pathRow: {
    alignItems: 'center',
    // Each row's translateX creates a stacking context, so default
    // ordering puts later rows on top. zIndex 1 + elevation matches
    // the baseline; the open row bumps these up below.
    zIndex: 1,
    elevation: 1,
  },
  pathRowOpen: {
    zIndex: 20,
    elevation: 20,
  },

  popover: {
    // Absolute so the card overlays subsequent rows instead of pushing
    // them down. The `top` / `bottom` offset is set per placement.
    position: 'absolute',
    width: 300,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    shadowColor: colors.brown900,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  popoverBelow: {
    // 88px node + 8px gap.
    top: 96,
  },
  popoverAbove: {
    // Same gap above the node so the visual rhythm reads symmetrically.
    bottom: 96,
  },
  popoverEyebrow: {
    fontSize: fontSizes.xs,
    color: colors.primary700,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Nunito_900Black',
  },
  popoverTitle: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    marginTop: 2,
    fontFamily: 'Nunito_900Black',
  },
  popoverBody: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
    fontFamily: 'Nunito_600SemiBold',
  },
  popoverMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: space.md,
  },
  popoverPill: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
})
