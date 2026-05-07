import { useMemo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { Lesson, Level, Topic } from '@mochilang/shared'
import { useProgress } from '../state/useProgress'
import { useCourse } from '../state/useCourse'
import { colors, fontSizes, radius, space, tintForTheme } from '../lib/theme'

interface Props {
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
}

/**
 * Phase 2 HomeScreen — vertical lesson list grouped by topic + level.
 * The web version's winding sin-wave path is fancier; we still render a
 * flat list here for cleaner small-screen layout. Topics with guides
 * surface a "📖 Notes" button that opens the TopicGuide modal.
 */
export default function HomeScreen({ onSelectLesson, onOpenGuide }: Props) {
  const progress = useProgress()
  const course = useCourse('zh-en')

  const isCompleted = (id: string) => !!progress.state.results[id]

  const nextId = useMemo(() => {
    for (const level of course.levels) {
      for (const topic of level.topics) {
        for (const lesson of topic.lessons) {
          if (!isCompleted(lesson.id)) return lesson.id
        }
      }
    }
    return null
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
            ? "Couldn't reach the course server. Phase 2 will bundle an offline copy."
            : 'No course content yet.'}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.shell}>
      <View style={styles.topbar}>
        <Text style={styles.langName}>Chinese</Text>
        <View style={styles.stats}>
          <Stat label="🔥" value={String(progress.state.streak)} />
          <Stat label="⚡" value={String(progress.state.totalXp)} />
        </View>
      </View>

      {course.levels.map((level) => (
        <LevelSection
          key={level.id}
          level={level}
          isCompleted={isCompleted}
          nextId={nextId}
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

function LevelSection({
  level,
  isCompleted,
  nextId,
  onSelectLesson,
  onOpenGuide,
}: {
  level: Level
  isCompleted: (id: string) => boolean
  nextId: string | null
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
}) {
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
          onSelectLesson={onSelectLesson}
          onOpenGuide={onOpenGuide}
        />
      ))}
    </View>
  )
}

function TopicCard({
  topic,
  topicNumber,
  isCompleted,
  nextId,
  onSelectLesson,
  onOpenGuide,
}: {
  topic: Topic
  topicNumber: number
  isCompleted: (id: string) => boolean
  nextId: string | null
  onSelectLesson: (lesson: Lesson) => void
  onOpenGuide: (topic: Topic) => void
}) {
  const tint = tintForTheme(topic.theme)
  const allDone = topic.lessons.every((l) => isCompleted(l.id))
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
            <Text style={[styles.topicEyebrow, { color: tint.fg }]}>
              Topic {topicNumber}
              {allDone ? ' ✓' : ''}
            </Text>
            <Text style={[styles.topicTitle, { color: tint.fg }]}>
              {topic.title}
            </Text>
            <Text style={[styles.topicDesc, { color: tint.fg }]}>
              {topic.description}
            </Text>
          </View>
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
        </View>
      </View>

      <View style={styles.lessons}>
        {topic.lessons.map((lesson) => {
          const done = isCompleted(lesson.id)
          const isNext = lesson.id === nextId
          return (
            <Pressable
              key={lesson.id}
              onPress={() => onSelectLesson(lesson)}
              style={({ pressed }) => [
                styles.lesson,
                done && styles.lessonDone,
                isNext && styles.lessonNext,
                pressed && { transform: [{ translateY: 1 }] },
              ]}
            >
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonMeta}>
                  ⚡ {lesson.xp} XP · {lesson.exercises.length} exercises
                </Text>
              </View>
              <Text style={styles.lessonChev}>
                {done ? '✓' : isNext ? '▶' : '›'}
              </Text>
            </Pressable>
          )
        })}
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
    fontWeight: '900',
    color: colors.text,
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
  statValue: { fontSize: fontSizes.sm, fontWeight: '900', color: colors.text },
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
    fontWeight: '900',
    color: colors.primary700,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  notesBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  notesBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topicEyebrow: {
    fontSize: fontSizes.xs,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topicTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '900',
    marginTop: 2,
  },
  topicDesc: { fontSize: fontSizes.sm, marginTop: 2 },
  lessons: { gap: space.sm },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  lessonDone: { backgroundColor: colors.success100, borderColor: colors.success500 },
  lessonNext: { borderColor: colors.primary500 },
  lessonInfo: { flex: 1, gap: 2 },
  lessonTitle: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
  lessonMeta: { fontSize: fontSizes.xs, color: colors.textMuted },
  lessonChev: { fontSize: 22, color: colors.textMuted, fontWeight: '900' },
})
