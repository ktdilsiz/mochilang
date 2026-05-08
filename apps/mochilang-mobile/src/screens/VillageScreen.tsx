import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  type LevelExamsPassed,
  type MochiSpec,
  type ProgressState,
  type TopicExamsPassed,
  buildVillageRoster,
  isTopicCleared,
} from '@mochilang/shared'
import { useCourse } from '../state/useCourse'
import { useProgress } from '../state/useProgress'
import { useTopicExams } from '../state/useTopicExams'
import { useLevelExams } from '../state/useLevelExams'
import {
  colors,
  fontSizes,
  radius,
  space,
  tintForTheme,
} from '../lib/theme'

/**
 * Dev override — flip to false before shipping. While true, every
 * mochi shows as unlocked regardless of topic progress so the village
 * art can be poked at without grinding lessons first.
 */
const DEV_UNLOCK_ALL = true

interface Props {
  courseId: string
}

/**
 * Village — mochi collection screen. Phase 1 is read-only: a grid of
 * mochi cards grouped by level. Each topic in the course's content
 * becomes a collectible; clearing the topic (lessons or skip-exam)
 * unlocks the mochi. Locked mochis show as silhouettes with a hint.
 *
 * Coins, decorations, cosmetics, and interactions land in later phases.
 * The placeholder art is an emoji glyph in a themed circle — real PNG
 * mochis will replace the glyph once authored.
 */
export default function VillageScreen({ courseId }: Props) {
  const insets = useSafeAreaInsets()
  const course = useCourse(courseId)
  const progress = useProgress()
  const topicExams = useTopicExams()
  const levelExams = useLevelExams()

  const roster = useMemo(
    () => buildVillageRoster(course.levels),
    [course.levels]
  )

  const { unlockedCount, totalCount } = useMemo(() => {
    let unlocked = 0
    let total = 0
    for (const region of roster) {
      total += region.mochis.length
      for (const mochi of region.mochis) {
        const topic = course.levels
          .find((l) => l.id === mochi.levelId)
          ?.topics.find((t) => t.id === mochi.topicId)
        if (!topic) continue
        if (
          DEV_UNLOCK_ALL ||
          isTopicCleared(topic, progress.state.results, topicExams.state)
        ) {
          unlocked += 1
        }
      }
    }
    return { unlockedCount: unlocked, totalCount: total }
  }, [roster, course.levels, progress.state.results, topicExams.state])

  return (
    <ScrollView
      style={styles.shell}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.md },
      ]}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Mochi Village</Text>
        <Text style={styles.heroTitle}>
          {unlockedCount} / {totalCount} mochis collected
        </Text>
        <Text style={styles.heroBody}>
          A new mochi moves in every time you clear a topic. Each level is its
          own region — finish a level to fully populate it.
        </Text>
      </View>

      {roster.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Pick a course and start clearing topics to populate your village.
          </Text>
        </View>
      )}

      {roster.map((region) => {
        const levelExamPassed = levelExams.state[region.levelId] === true
        return (
          <RegionCard
            key={region.levelId}
            levelName={region.levelName}
            mochis={region.mochis}
            results={progress.state.results}
            topicExamsPassed={topicExams.state}
            levelExamPassed={levelExamPassed}
            findTopic={(mochi) =>
              course.levels
                .find((l) => l.id === mochi.levelId)
                ?.topics.find((t) => t.id === mochi.topicId) ?? null
            }
          />
        )
      })}

      <View style={{ height: space.xxl }} />
    </ScrollView>
  )
}

interface RegionCardProps {
  levelName: string
  mochis: MochiSpec[]
  results: ProgressState['results']
  topicExamsPassed: TopicExamsPassed
  levelExamPassed: boolean
  findTopic: (mochi: MochiSpec) => { id: string; lessons: { id: string }[] } | null
}

function RegionCard({
  levelName,
  mochis,
  results,
  topicExamsPassed,
  levelExamPassed,
  findTopic,
}: RegionCardProps) {
  const cleared = mochis.filter((m) => {
    if (DEV_UNLOCK_ALL) return true
    const topic = findTopic(m)
    if (!topic) return false
    // Inline isTopicCleared so we can reuse the lookup above without
    // constructing the full Topic shape (we only have id + lessons).
    return (
      topicExamsPassed[topic.id] === true ||
      (topic.lessons.length > 0 &&
        topic.lessons.every((l) => results[l.id] !== undefined))
    )
  }).length

  return (
    <View style={styles.region}>
      <View style={styles.regionHeader}>
        <Text style={styles.regionName}>{levelName}</Text>
        <Text style={styles.regionCount}>
          {cleared} / {mochis.length}
        </Text>
      </View>
      {levelExamPassed && (
        <View style={styles.regionBadge}>
          <Text style={styles.regionBadgeText}>Level exam passed</Text>
        </View>
      )}
      <View style={styles.grid}>
        {mochis.map((m) => {
          const topic = findTopic(m)
          const unlocked =
            DEV_UNLOCK_ALL ||
            (topic !== null &&
              (topicExamsPassed[topic.id] === true ||
                (topic.lessons.length > 0 &&
                  topic.lessons.every((l) => results[l.id] !== undefined))))
          return <MochiCard key={m.id} mochi={m} unlocked={unlocked} />
        })}
      </View>
    </View>
  )
}

function MochiCard({ mochi, unlocked }: { mochi: MochiSpec; unlocked: boolean }) {
  const tint = tintForTheme(mochi.theme)
  return (
    <View
      style={[
        styles.card,
        unlocked && {
          backgroundColor: tint.bg,
          borderColor: tint.edge,
          borderBottomColor: tint.edgeDeep,
        },
      ]}
    >
      <View
        style={[
          styles.glyphCircle,
          unlocked && { backgroundColor: tint.edge, borderColor: tint.edgeDeep },
        ]}
      >
        <Text style={[styles.glyph, unlocked && { color: tint.fg }]}>
          {unlocked ? mochi.archetype.glyph : '🔒'}
        </Text>
      </View>
      <Text
        style={[styles.name, unlocked && { color: tint.fg }]}
        numberOfLines={1}
      >
        Mochi the {mochi.archetype.role}
      </Text>
      <Text
        style={[styles.subtitle, unlocked && { color: tint.fg, opacity: 0.85 }]}
        numberOfLines={2}
      >
        {unlocked ? mochi.archetype.flavor : `Clear ${mochi.topicTitle}`}
      </Text>
    </View>
  )
}

const CARD_GAP = space.sm
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.lg,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontFamily: 'Nunito_900Black',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  heroBody: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: fontSizes.sm * 1.45,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  region: {
    gap: space.sm,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  regionName: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  regionCount: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontFamily: 'Nunito_700Bold',
  },
  regionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success100,
    borderColor: colors.success500,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  regionBadgeText: {
    fontSize: fontSizes.xs,
    color: colors.success700,
    fontFamily: 'Nunito_900Black',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
    alignItems: 'center',
  },
  glyphCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 30,
    color: colors.textSubtle,
  },
  name: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontFamily: 'Nunito_900Black',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: fontSizes.xs * 1.4,
  },
})
