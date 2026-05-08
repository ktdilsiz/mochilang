import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { Lesson, Level, Topic } from '@mochilang/shared'
import { useProgress } from '../state/useProgress'
import { useCourse } from '../state/useCourse'
import LedgeButton from '../components/LedgeButton'
import LessonNode from '../components/LessonNode'
import { colors, fontSizes, radius, space, tintForTheme } from '../lib/theme'

interface Props {
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
}

/**
 * HomeScreen — themed topic banners + winding lesson path with circular
 * nodes (sin-wave horizontal offset, matches web). Tapping a node opens
 * an inline popover card showing title, description, XP, exercise count,
 * and Start/Practice button.
 */
export default function HomeScreen({ onSelectLesson, onOpenGuide }: Props) {
  const progress = useProgress()
  const course = useCourse('zh-en')
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)

  const isCompleted = (id: string) => !!progress.state.results[id]

  // Find the next-up lesson + the topic/level that contains it for the
  // hero card.
  const heroInfo = useMemo(() => {
    let nextId: string | null = null
    let heroLevel: Level | null = null
    let heroTopic: Topic | null = null
    let heroTopicIndex = 0
    outer: for (const level of course.levels) {
      for (let t = 0; t < level.topics.length; t++) {
        const topic = level.topics[t]
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
  }, [course.levels, progress.state.results])

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
      contentContainerStyle={styles.shell}
      onScrollBeginDrag={() => setOpenLessonId(null)}
    >
      <View style={styles.topbar}>
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

      {course.levels.map((level) => (
        <LevelSection
          key={level.id}
          level={level}
          isCompleted={isCompleted}
          nextId={nextId}
          openLessonId={openLessonId}
          setOpenLessonId={setOpenLessonId}
          onSelectLesson={onSelectLesson}
          onOpenGuide={onOpenGuide}
        />
      ))}
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
  isCompleted: (id: string) => boolean
  nextId: string | null
  openLessonId: string | null
  setOpenLessonId: (v: string | null) => void
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
}

function LevelSection({
  level,
  isCompleted,
  nextId,
  openLessonId,
  setOpenLessonId,
  onSelectLesson,
  onOpenGuide,
}: SectionProps) {
  return (
    <View style={styles.level}>
      <View style={styles.levelDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.levelPill}>{level.name}</Text>
        <View style={styles.dividerLine} />
      </View>
      {level.topics.map((topic, ti) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          topicNumber={ti + 1}
          isCompleted={isCompleted}
          nextId={nextId}
          openLessonId={openLessonId}
          setOpenLessonId={setOpenLessonId}
          onSelectLesson={onSelectLesson}
          onOpenGuide={onOpenGuide}
        />
      ))}
    </View>
  )
}

interface TopicProps {
  topic: Topic
  topicNumber: number
  isCompleted: (id: string) => boolean
  nextId: string | null
  openLessonId: string | null
  setOpenLessonId: (v: string | null) => void
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
}

function TopicCard({
  topic,
  topicNumber,
  isCompleted,
  nextId,
  openLessonId,
  setOpenLessonId,
  onSelectLesson,
  onOpenGuide,
}: TopicProps) {
  const tint = tintForTheme(topic.theme)
  const allDone = topic.lessons.every((l) => isCompleted(l.id))
  const completed = topic.lessons.filter((l) => isCompleted(l.id)).length

  return (
    <View style={styles.topic}>
      <View
        style={[
          styles.topicHeader,
          {
            backgroundColor: tint.bg,
            borderColor: tint.edge,
            borderBottomColor: tint.edgeDeep,
          },
        ]}
      >
        <View style={styles.topicHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.topicEyebrowRow}>
              <Text style={[styles.topicEyebrow, { color: tint.fg }]}>
                Topic {topicNumber}
              </Text>
              {allDone && (
                <Text style={styles.topicDone}>✓</Text>
              )}
            </View>
            <Text style={[styles.topicTitle, { color: tint.fg }]}>
              {topic.title}
            </Text>
            <Text style={[styles.topicDesc, { color: tint.fg }]}>
              {topic.description}
            </Text>
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
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>
                {completed} / {topic.lessons.length}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.path}>
        {topic.lessons.map((lesson, idx) => {
          const offset = Math.sin(idx * (Math.PI / 4)) * 80
          const isOpen = openLessonId === lesson.id
          return (
            <View
              key={lesson.id}
              style={[styles.pathRow, { transform: [{ translateX: offset }] }]}
            >
              <LessonNode
                lesson={lesson}
                done={isCompleted(lesson.id)}
                isNext={lesson.id === nextId}
                onPress={() => setOpenLessonId(isOpen ? null : lesson.id)}
              />
              {isOpen && (
                <LessonPopover
                  lesson={lesson}
                  done={isCompleted(lesson.id)}
                  isNext={lesson.id === nextId}
                  onStart={() => {
                    setOpenLessonId(null)
                    onSelectLesson(lesson)
                  }}
                  /* Counter-translate so the popover sits centered on
                   * the natural column even though the row is offset. */
                  rowOffset={offset}
                />
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function LessonPopover({
  lesson,
  done,
  isNext,
  onStart,
  rowOffset,
}: {
  lesson: Lesson
  done: boolean
  isNext: boolean
  onStart: () => void
  rowOffset: number
}) {
  return (
    <View style={[styles.popover, { transform: [{ translateX: -rowOffset }] }]}>
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
      <View style={{ marginTop: space.md }}>
        <LedgeButton
          label={done ? 'Practice again' : 'Start'}
          tone={done ? 'success' : 'primary'}
          size="lg"
          onPress={onStart}
        />
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
    paddingTop: space.xs,
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

  level: { gap: space.md },
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

  topic: { gap: space.sm },
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
  },
  pathRow: {
    alignItems: 'center',
  },

  popover: {
    marginTop: space.md,
    width: 300,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    shadowColor: colors.brown900,
    shadowOpacity: 0.12,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
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
