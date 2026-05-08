import { useMemo } from 'react'
import {
  Dimensions,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  type MochiSpec,
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
/** Each level claims a slice of the panorama this wide. */
const LEVEL_SLICE_WIDTH = SCREEN_WIDTH * 0.95
/** Reserve space at the bottom edge so mochis don't sit on the very last pixel. */
const BOTTOM_PAD = 20

/**
 * Mochi Village — horizontal panorama with the Gemini-generated
 * background art behind every level. The art is one wide image
 * (`assets/village-bg.png`) that ImageBackground scales to fill the
 * full scrollable panorama; mochis are placed absolutely on top.
 *
 * Locked mochis still show, but as silhouettes — the village should
 * feel populated even before it's actually populated, so the user
 * can see where empty plots will fill in.
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

  const panoramaWidth = roster.length * LEVEL_SLICE_WIDTH

  return (
    <View style={styles.shell}>
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
          decelerationRate="fast"
        >
          <ImageBackground
            source={require('../../assets/village-bg.png')}
            resizeMode="cover"
            style={[styles.panorama, { width: panoramaWidth }]}
          >
            {/* Level-marker signs sit above mochis so they're never hidden. */}
            {roster.map((region, i) => {
              const offsetX = i * LEVEL_SLICE_WIDTH
              const examPassed = levelExams.state[region.levelId] === true
              const cleared = region.mochis.filter(isMochiUnlocked).length
              return (
                <View
                  key={`sign-${region.levelId}`}
                  style={[styles.sign, { left: offsetX + 16 }]}
                >
                  <Text style={styles.signTitle}>{region.levelName}</Text>
                  <Text style={styles.signCount}>
                    {cleared} / {region.mochis.length} mochis
                  </Text>
                  {examPassed && (
                    <View style={styles.signBadge}>
                      <Text style={styles.signBadgeText}>Level exam ✓</Text>
                    </View>
                  )}
                </View>
              )
            })}

            {/* Mochis distributed inside each level's slice. */}
            {roster.map((region, i) =>
              region.mochis.map((m, j) => {
                const sliceStart = i * LEVEL_SLICE_WIDTH
                const pos = layoutForMochi(j, region.mochis.length, sliceStart)
                return (
                  <MochiCharacter
                    key={m.id}
                    mochi={m}
                    unlocked={isMochiUnlocked(m)}
                    x={pos.x}
                    y={pos.y}
                  />
                )
              })
            )}
          </ImageBackground>
        </ScrollView>
      )}
    </View>
  )
}

/**
 * Pick a position for the i-th mochi inside a level's slice. Spreads
 * evenly along x, with a sin-wave vertical offset around the bottom
 * third of the scene so they sit on the village ground.
 */
function layoutForMochi(
  i: number,
  total: number,
  sliceStart: number
): { x: number; y: number } {
  const margin = 50
  const usable = LEVEL_SLICE_WIDTH - margin * 2
  const step = total <= 1 ? 0 : usable / Math.max(1, total - 1)
  const x = sliceStart + margin + step * i
  // Anchor mochis to the bottom third of the scene where the ground
  // tends to be in the painting; sin-wave wiggle keeps depth interest.
  const baseY = 320
  const wave = Math.sin(i * 0.95) * 60
  const stagger = i % 2 === 0 ? 0 : 30
  return { x, y: baseY + wave + stagger }
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
          { color: unlocked ? colors.text : 'rgba(0,0,0,0.55)' },
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

  panorama: {
    height: '100%',
    paddingBottom: BOTTOM_PAD,
  },
  sign: {
    position: 'absolute',
    top: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: colors.brown600,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    gap: 2,
  },
  signTitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Nunito_900Black',
    color: colors.brown700,
  },
  signCount: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontFamily: 'Nunito_700Bold',
  },
  signBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success500,
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
