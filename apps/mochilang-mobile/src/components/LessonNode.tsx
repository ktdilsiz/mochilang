import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Lesson } from '@mochilang/shared'
import { colors, radius, tintForTheme } from '../lib/theme'

interface Props {
  lesson: Lesson
  done: boolean
  isNext: boolean
  onPress: () => void
}

/**
 * LessonNode — circular tappable button on the winding home path.
 * Mirrors the web's `.home-node` look: chunky 4px border with a thicker
 * bottom edge, themed colors, an icon centered. The "next-up" lesson
 * pulses (a static thin ring around the node — RN doesn't have CSS
 * keyframes; a real animation would need Reanimated).
 */
export default function LessonNode({ lesson, done, isNext, onPress }: Props) {
  const tint = tintForTheme(lesson.theme)
  const tone = done
    ? {
        bg: colors.success100,
        edge: colors.success500,
        edgeDeep: colors.success700,
        fg: colors.success700,
      }
    : isNext
      ? {
          bg: colors.primary100,
          edge: colors.primary500,
          edgeDeep: colors.primary700,
          fg: colors.primary700,
        }
      : tint

  return (
    <View style={styles.wrap}>
      {isNext && !done && <View style={[styles.pulse, { borderColor: colors.primary500 }]} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={lesson.title + (done ? ' (completed)' : '')}
        onPress={onPress}
        style={({ pressed }) => [
          styles.node,
          {
            backgroundColor: tone.bg,
            borderColor: tone.edge,
            borderBottomColor: tone.edgeDeep,
          },
          pressed && { transform: [{ translateY: 2 }] },
        ]}
      >
        <Text style={[styles.icon, { color: tone.fg }]}>
          {done ? '✓' : nodeGlyph(lesson)}
        </Text>
      </Pressable>
    </View>
  )
}

/**
 * nodeGlyph picks a thematic emoji for the not-yet-started lesson node.
 * Web uses an SVG icon set keyed by theme; this is a quick stand-in
 * that keeps the trail visually varied. A future pass could swap in
 * react-native-svg with the real icons.
 */
function nodeGlyph(lesson: Lesson): string {
  switch (lesson.theme) {
    case 'greetings':
      return '💬'
    case 'numbers':
      return '#'
    case 'family':
      return '👪'
    case 'food':
      return '🍜'
    case 'verbs':
      return '⚙️'
    case 'location':
    case 'directions':
      return '📍'
    case 'time':
      return '⏰'
    case 'questions':
      return '?'
    case 'colors':
      return '🎨'
    case 'weather':
      return '☁️'
    case 'review':
      return '🔄'
    case 'basics':
    default:
      return '★'
  }
}

const styles = StyleSheet.create({
  wrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderBottomWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 30,
    fontWeight: '900',
  },
  pulse: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    borderWidth: 4,
    opacity: 0.5,
  },
})
