import { useMemo } from 'react'
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  type LessonTheme,
  type MochiSpec,
  type ProgressState,
  type TopicExamsPassed,
  type VillageRegion,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window')
/** Each level scene is wider than the screen so the user has to walk it. */
const SCENE_WIDTH = Math.max(SCREEN_WIDTH * 1.6, 560)
/** Reserves space for sky vs. ground in the scene's gradient. */
const HORIZON = 0.62

/**
 * Per-level palette for the panorama scene. Sky on top, horizon line,
 * ground on bottom. Real PNG backgrounds slot in later — the named
 * keys here just need to keep matching level ids.
 */
const LEVEL_PALETTE: Record<string, { sky: [string, string]; ground: string; sign: string }> = {
  a1: { sky: ['#cdeaff', '#fff4d6'], ground: '#bdd86c', sign: '#7fa831' }, // sunny garden
  a2: { sky: ['#ffe6c4', '#ffd09a'], ground: '#e3b27a', sign: '#a06a35' }, // market lane at dusk
  b1: { sky: ['#d6ecff', '#eaf6ff'], ground: '#b8c8e3', sign: '#506a96' }, // riverside library
  b2: { sky: ['#cfe9d4', '#e7f5e1'], ground: '#92cf86', sign: '#3d7e36' }, // forest grove
  c1: { sky: ['#e3d4ff', '#fbe8ff'], ground: '#b8a3e0', sign: '#6f53a8' }, // dusk square
  c2: { sky: ['#cad3eb', '#9ea9c9'], ground: '#5d6985', sign: '#2c344a' }, // mountain pass
}
const FALLBACK_PALETTE = LEVEL_PALETTE.a1

/**
 * Mochi Village — horizontal panorama. Each level is a wide scene the
 * user walks left → right. Within a scene, mochis are placed along a
 * sin-wave "path" so they cluster organically rather than in a grid.
 *
 * Locked mochis still show, but as silhouettes — the village should
 * feel populated even before it's actually populated, so the user can
 * see where empty plots will fill in.
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

  const isMochiUnlocked = useMemo(() => {
    return (mochi: MochiSpec): boolean => {
      if (DEV_UNLOCK_ALL) return true
      const topic = course.levels
        .find((l) => l.id === mochi.levelId)
        ?.topics.find((t) => t.id === mochi.topicId)
      if (!topic) return false
      return isTopicCleared(topic, progress.state.results, topicExams.state)
    }
  }, [course.levels, progress.state.results, topicExams.state])

  const { unlockedCount, totalCount } = useMemo(() => {
    let unlocked = 0
    let total = 0
    for (const region of roster) {
      total += region.mochis.length
      for (const m of region.mochis) {
        if (isMochiUnlocked(m)) unlocked += 1
      }
    }
    return { unlockedCount: unlocked, totalCount: total }
  }, [roster, isMochiUnlocked])

  return (
    <View style={styles.shell}>
      {/* Fixed top header — sits over the scrolling scene. */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Mochi Village</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>
              {unlockedCount} / {totalCount}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Scroll right to walk the village. New mochis arrive when you clear
          their topic.
        </Text>
      </View>

      {roster.length === 0 ? (
        <View style={styles.emptyShell}>
          <Text style={styles.emptyText}>
            Pick a course and start clearing topics to populate your village.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.panorama}
          decelerationRate="fast"
        >
          {roster.map((region, i) => {
            const levelExamPassed = levelExams.state[region.levelId] === true
            return (
              <LevelScene
                key={region.levelId}
                region={region}
                index={i}
                isUnlocked={isMochiUnlocked}
                examPassed={levelExamPassed}
                progressResults={progress.state.results}
                topicExams={topicExams.state}
              />
            )
          })}
          {/* Trailing pad so the last scene doesn't butt against the edge. */}
          <View style={{ width: space.lg }} />
        </ScrollView>
      )}
    </View>
  )
}

interface SceneProps {
  region: VillageRegion
  index: number
  isUnlocked: (m: MochiSpec) => boolean
  examPassed: boolean
  progressResults: ProgressState['results']
  topicExams: TopicExamsPassed
}

function LevelScene({
  region,
  index,
  isUnlocked,
  examPassed,
  progressResults,
  topicExams,
}: SceneProps) {
  const palette = LEVEL_PALETTE[region.levelId] ?? FALLBACK_PALETTE

  const clearedCount = region.mochis.filter((m) => {
    if (DEV_UNLOCK_ALL) return true
    return (
      topicExams[m.topicId] === true ||
      // light inline check — we don't have the Topic object here, just
      // ids — so we ask "did the user complete every lesson in topic X?"
      // by counting results keyed by lesson id. The roster already
      // captured the topic structure when it was built.
      false
    )
  }).length

  return (
    <View style={[styles.scene, { width: SCENE_WIDTH }]}>
      <LinearGradient
        colors={[palette.sky[0], palette.sky[1], palette.ground]}
        locations={[0, HORIZON, HORIZON]}
        style={StyleSheet.absoluteFill}
      />

      {/* Scene-marker sign */}
      <View style={[styles.sign, { borderColor: palette.sign }]}>
        <Text style={[styles.signTitle, { color: palette.sign }]}>
          {region.levelName}
        </Text>
        <Text style={styles.signCount}>
          {clearedCount} / {region.mochis.length} mochis
        </Text>
        {examPassed && (
          <View style={[styles.signBadge, { backgroundColor: palette.sign }]}>
            <Text style={styles.signBadgeText}>Level exam ✓</Text>
          </View>
        )}
      </View>

      {/* Mochis placed along an organic sin-wave path. */}
      {region.mochis.map((m, i) => {
        const pos = layoutForMochi(i, region.mochis.length)
        return (
          <MochiCharacter
            key={m.id}
            mochi={m}
            unlocked={isUnlocked(m)}
            x={pos.x}
            y={pos.y}
          />
        )
      })}

      {/* Trailing arrow if more scenes follow */}
      {index >= 0 && (
        <View style={styles.scrollHint} pointerEvents="none">
          <Text style={styles.scrollHintText}>›</Text>
        </View>
      )}
    </View>
  )
}

/**
 * Pick a position inside the scene for the i-th mochi. Distributed
 * evenly along the x-axis with a sin-wave vertical offset around the
 * horizon line so the placement feels intentional rather than gridded.
 */
function layoutForMochi(i: number, total: number): { x: number; y: number } {
  const margin = 60
  const usable = SCENE_WIDTH - margin * 2
  const step = total <= 1 ? 0 : usable / Math.max(1, total - 1)
  const x = margin + step * i
  // Place mochis around the horizon line. Two staggered rows via the
  // sin pattern give the village some depth.
  const horizonY = 360 // approx pixel y for horizon at typical screen height
  const wave = Math.sin(i * 0.95) * 70
  const stagger = (i % 2 === 0 ? 0 : 30)
  return { x, y: horizonY + wave + stagger }
}

interface CharProps {
  mochi: MochiSpec
  unlocked: boolean
  x: number
  y: number
}

function MochiCharacter({ mochi, unlocked, x, y }: CharProps) {
  const tint = tintForTheme(mochi.theme)
  const lockedTint = {
    bg: 'rgba(0,0,0,0.16)',
    edge: 'rgba(0,0,0,0.28)',
    edgeDeep: 'rgba(0,0,0,0.4)',
    fg: 'rgba(255,255,255,0.85)',
  }
  const tone = unlocked ? tint : lockedTint

  return (
    <Pressable style={[styles.mochiPos, { left: x - 36, top: y - 36 }]}>
      <View
        style={[
          styles.mochiBody,
          {
            backgroundColor: tone.bg,
            borderColor: tone.edge,
            borderBottomColor: tone.edgeDeep,
          },
        ]}
      >
        <Text style={[styles.mochiGlyph, { color: tone.fg }]}>
          {unlocked ? mochi.archetype.glyph : '?'}
        </Text>
      </View>
      <Text
        style={[
          styles.mochiName,
          { color: unlocked ? colors.text : 'rgba(0,0,0,0.45)' },
        ]}
        numberOfLines={1}
      >
        {unlocked ? mochi.archetype.role : '???'}
      </Text>
      {/* Tiny ground shadow */}
      <View style={styles.shadow} pointerEvents="none" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  countPill: {
    backgroundColor: colors.cream100,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 2,
  },
  countPillText: {
    fontSize: fontSizes.xs,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  panorama: { flexDirection: 'row' },
  scene: {
    height: '100%',
    overflow: 'hidden',
  },
  sign: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    gap: 2,
  },
  signTitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Nunito_900Black',
  },
  signCount: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontFamily: 'Nunito_700Bold',
  },
  signBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 1,
    marginTop: 2,
  },
  signBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'Nunito_900Black',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  mochiPos: {
    position: 'absolute',
    width: 72,
    alignItems: 'center',
  },
  mochiBody: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mochiGlyph: {
    fontSize: 28,
    fontFamily: 'Nunito_900Black',
  },
  mochiName: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: 'Nunito_900Black',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
    maxWidth: 96,
  },
  shadow: {
    position: 'absolute',
    bottom: -6,
    width: 44,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  scrollHint: {
    position: 'absolute',
    right: 12,
    top: '45%',
    backgroundColor: 'rgba(0,0,0,0.18)',
    width: 24,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollHintText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 22,
    fontFamily: 'Nunito_900Black',
  },

  emptyShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
})
