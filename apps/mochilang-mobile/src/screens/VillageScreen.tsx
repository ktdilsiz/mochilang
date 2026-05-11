import { useMemo, useState } from 'react'
import {
  Image,
  ImageBackground,
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  MOCHI_ROSTER,
  MOCHI_ROSTER_SIZE,
  countUnlockedMochis,
  nextMochi,
} from '@mochilang/shared'
import { useCourse } from '../state/useCourse'
import { useLevelExams } from '../state/useLevelExams'
import { useProgress } from '../state/useProgress'
import { useSettings } from '../state/useSettings'
import { MOCHI_SPRITES } from '../data/mochiSprites'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  courseId: string
}

/**
 * Mochi Village — horizontal panorama showing the painted village
 * background (assets/village-bg.png) with 120 mochi sprites scattered
 * across it. The painting is one wide image; mochis are positioned
 * absolutely on top with deterministic-random placement so the layout
 * is stable across renders but doesn't look gridded.
 *
 * Locked mochis render as silhouettes via Image tintColor — same
 * sprite shape, single dark color. Unlocking flips the tint off.
 */
const IMAGE_ASPECT = 2172 / 724 // matches assets/village-bg.png

const SPRITE_HEIGHT = 56
/**
 * Vertical band of the panorama where mochis can stand. Tuned to keep
 * them on the painted ground area rather than floating in the sky.
 */
const GROUND_BAND_TOP = 0.42
const GROUND_BAND_BOTTOM = 0.86

export default function VillageScreen({ courseId }: Props) {
  const insets = useSafeAreaInsets()
  const course = useCourse(courseId)
  const levelExams = useLevelExams()
  const progress = useProgress()
  const { state: settings } = useSettings()
  const devMode = settings.developerMode
  const [viewportHeight, setViewportHeight] = useState(0)

  function handleLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height
    if (h !== viewportHeight) setViewportHeight(h)
  }

  const panoramaWidth = viewportHeight * IMAGE_ASPECT
  const totalXp = progress.state.totalXp
  const unlockedCount = useMemo(() => countUnlockedMochis(totalXp), [totalXp])
  const next = useMemo(() => nextMochi(totalXp), [totalXp])

  return (
    <View style={styles.shell}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Mochi Village</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>
              {unlockedCount} / {MOCHI_ROSTER_SIZE}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {next
            ? `Next mochi unlocks at ${next.unlockXp} XP — ${
                next.unlockXp - totalXp
              } to go.`
            : 'You unlocked the entire village. ✨'}
        </Text>
      </View>

      <View style={styles.scrollWrap} onLayout={handleLayout}>
        {course.levels.length === 0 ? (
          <View style={styles.emptyShell}>
            <Text style={styles.emptyText}>
              Pick a course and start clearing topics to populate your village.
            </Text>
          </View>
        ) : viewportHeight > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
          >
            <ImageBackground
              source={require('../../assets/village-bg.png')}
              resizeMode="cover"
              style={{ width: panoramaWidth, height: viewportHeight }}
            >
              {/* Level signs — markers along the top of the panorama. */}
              {course.levels.map((level, i) => {
                const sliceWidth = panoramaWidth / course.levels.length
                const offsetX = i * sliceWidth + 16
                const examPassed = levelExams.state[level.id] === true
                return (
                  <View
                    key={`sign-${level.id}`}
                    style={[styles.sign, { left: offsetX }]}
                  >
                    <Text style={styles.signTitle}>{level.name}</Text>
                    {examPassed && (
                      <View style={styles.signBadge}>
                        <Text style={styles.signBadgeText}>Level exam ✓</Text>
                      </View>
                    )}
                  </View>
                )
              })}

              {/* Mochis scattered across the panorama. Stable across
                  renders because positions are seeded by index. */}
              {MOCHI_ROSTER.map((mochi) => {
                const unlocked =
                  devMode || totalXp >= mochi.unlockXp
                const sprite = MOCHI_SPRITES[mochi.index]
                if (!sprite) return null
                const pos = placementFor(
                  mochi.index,
                  panoramaWidth,
                  viewportHeight
                )
                return (
                  <Image
                    key={mochi.id}
                    source={sprite}
                    resizeMode="contain"
                    style={[
                      styles.sprite,
                      {
                        left: pos.x - SPRITE_HEIGHT / 2,
                        top: pos.y - SPRITE_HEIGHT,
                        width: SPRITE_HEIGHT,
                        height: SPRITE_HEIGHT,
                      },
                      !unlocked && styles.spriteLocked,
                    ]}
                  />
                )
              })}
            </ImageBackground>
          </ScrollView>
        ) : null}
      </View>
    </View>
  )
}

/**
 * Deterministic pseudo-random placement for the n-th mochi. Two
 * independent linear-congruential streams keep x + y uncorrelated,
 * and seeding by index makes the village look the same on every
 * render (no jitter on re-mount) while still feeling scattered.
 */
function placementFor(
  index: number,
  panoramaWidth: number,
  panoramaHeight: number
): { x: number; y: number } {
  const margin = 40
  // PRNG #1 → x ∈ [0, 1)
  const a = Math.abs(Math.sin(index * 12.9898) * 43758.5453)
  const rx = a - Math.floor(a)
  // PRNG #2 → y ∈ [0, 1)
  const b = Math.abs(Math.sin(index * 78.233 + 7.13) * 43758.5453)
  const ry = b - Math.floor(b)

  const x = margin + rx * (panoramaWidth - margin * 2)
  const yMin = panoramaHeight * GROUND_BAND_TOP
  const yMax = panoramaHeight * GROUND_BAND_BOTTOM
  const y = yMin + ry * (yMax - yMin)
  return { x, y }
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

  scrollWrap: { flex: 1 },

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

  sprite: {
    position: 'absolute',
  },
  spriteLocked: {
    opacity: 0.3,
    tintColor: 'rgba(0,0,0,0.85)',
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
