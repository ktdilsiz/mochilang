import { useMemo, useState } from 'react'
import {
  ImageBackground,
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { buildVillageRoster } from '@mochilang/shared'
import { useCourse } from '../state/useCourse'
import { useLevelExams } from '../state/useLevelExams'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  courseId: string
}

/**
 * Mochi Village — horizontal panorama showing the painted village
 * background (assets/village-bg.png, 3904x1088 ≈ 3.589:1 aspect).
 *
 * The panorama scales to the available viewport height and gets a
 * width from that × the image aspect ratio, so the whole painting is
 * visible end-to-end as the user scrolls. Mochi characters are
 * intentionally omitted right now — placement on the painted scene
 * (huts, lily ponds, clearings) is a follow-up task.
 *
 * Level signs are still drawn at proportional positions along the
 * panorama so the user can see which stretch belongs to which level.
 */
const IMAGE_ASPECT = 3904 / 1088

export default function VillageScreen({ courseId }: Props) {
  const insets = useSafeAreaInsets()
  const course = useCourse(courseId)
  const levelExams = useLevelExams()
  const [viewportHeight, setViewportHeight] = useState(0)

  const roster = useMemo(
    () => buildVillageRoster(course.levels),
    [course.levels]
  )

  function handleLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height
    if (h !== viewportHeight) setViewportHeight(h)
  }

  const panoramaWidth = viewportHeight * IMAGE_ASPECT

  return (
    <View style={styles.shell}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Text style={styles.title}>Mochi Village</Text>
        <Text style={styles.subtitle}>
          Scroll right to walk the village.
        </Text>
      </View>

      <View style={styles.scrollWrap} onLayout={handleLayout}>
        {roster.length === 0 ? (
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
              style={{
                width: panoramaWidth,
                height: viewportHeight,
              }}
            >
              {roster.map((region, i) => {
                const sliceWidth = panoramaWidth / roster.length
                const offsetX = i * sliceWidth + 16
                const examPassed = levelExams.state[region.levelId] === true
                return (
                  <View
                    key={`sign-${region.levelId}`}
                    style={[styles.sign, { left: offsetX }]}
                  >
                    <Text style={styles.signTitle}>{region.levelName}</Text>
                    {examPassed && (
                      <View style={styles.signBadge}>
                        <Text style={styles.signBadgeText}>Level exam ✓</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </ImageBackground>
          </ScrollView>
        ) : null}
      </View>
    </View>
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
  title: {
    fontSize: fontSizes.xl,
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
