import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Lesson } from '@mochilang/shared'
import { colors, radius, tintForTheme } from '../lib/theme'

interface Props {
  lesson: Lesson
  done: boolean
  isNext: boolean
  onPress: () => void
  /** When true, render the node muted/disabled (topic gate). */
  locked?: boolean
}

/**
 * LessonNode — circular tappable button on the winding home path.
 * Mirrors the web's `.home-node` look: chunky 4px border with a thicker
 * bottom edge, themed colors, an icon centered. The "next-up" lesson
 * gets an animated pulse ring (`Animated.loop` driving scale + opacity)
 * to draw the eye, equivalent to the web's CSS `@keyframes home-pulse`.
 */
export default function LessonNode({ lesson, done, isNext, onPress, locked }: Props) {
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

  // Pulse animation only runs when this node is the active "next up".
  // We always create the Animated.Value so the hooks rule is satisfied;
  // the `useEffect` early-returns when isNext is false.
  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!isNext || done) {
      pulse.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [isNext, done, pulse])

  const pulseScale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.18, 1],
  })
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.65, 0, 0.65],
  })

  return (
    <View style={styles.wrap}>
      {isNext && !done && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            { borderColor: colors.primary500 },
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          lesson.title +
          (done ? ' (completed)' : '') +
          (locked ? ' (locked)' : '')
        }
        disabled={locked}
        onPress={onPress}
        style={({ pressed }) => [
          styles.node,
          {
            backgroundColor: tone.bg,
            borderColor: tone.edge,
            borderBottomColor: tone.edgeDeep,
          },
          pressed && !locked && { transform: [{ translateY: 2 }] },
          locked && styles.nodeLocked,
        ]}
      >
        <Text style={[styles.icon, { color: tone.fg }]}>
          {done ? '✓' : locked ? '🔒' : nodeGlyph(lesson)}
        </Text>
      </Pressable>
    </View>
  )
}

// Glyph pools per theme — one element used to be hard-coded, now we
// pick deterministically from a pool of related symbols based on the
// lesson id so siblings on the path don't all read the same. Dialogue
// lessons override the theme pool because the conversation framing is
// more distinctive than the topic.
const DIALOGUE_GLYPHS = ['💬', '🗣️', '🎭', '📣', '👋', '☎️', '🤝'] as const

const THEME_GLYPHS: Record<string, readonly string[]> = {
  greetings: ['👋', '🙋', '🤝', '😊', '👐', '🙌'],
  numbers: ['#', '🔢', '1️⃣', '➕', '➗', '📊', '🧮'],
  family: ['👪', '👨‍👩‍👧', '👵', '👶', '🏡', '🫂'],
  food: ['🍜', '🍙', '🍱', '🍣', '🥢', '🍵', '🥟', '🍰', '🍡'],
  verbs: ['⚙️', '🏃', '💃', '🤸', '🚶', '✍️', '🎬', '🛠️'],
  location: ['📍', '🗺️', '🧭', '🏘️', '➡️', '🛣️'],
  directions: ['🧭', '➡️', '⬅️', '↗️', '🗺️', '🚦'],
  time: ['⏰', '🕐', '📅', '⏳', '🌙', '☀️', '🕰️'],
  questions: ['?', '🤔', '❓', '🧐', '💭', '❔'],
  colors: ['🎨', '🌈', '🖍️', '🎭', '🟥', '🟦'],
  weather: ['☁️', '🌤️', '🌧️', '⛅', '❄️', '🌪️', '☀️', '🌈'],
  review: ['🔄', '♻️', '🎯', '🏆', '⭐', '🔁'],
  basics: ['★', '✨', '🌟', '💫', '🌸', '🪷', '🌱', '🍃'],
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function pickFrom<T>(arr: readonly T[], seed: string): T {
  return arr[hashString(seed) % arr.length]
}

function nodeGlyph(lesson: Lesson): string {
  if (lesson.exercises.some((e) => e.type === 'dialogue')) {
    return pickFrom(DIALOGUE_GLYPHS, lesson.id)
  }
  const pool = THEME_GLYPHS[lesson.theme] ?? THEME_GLYPHS.basics
  return pickFrom(pool, lesson.id)
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
    fontFamily: 'Nunito_900Black',
  },
  pulse: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    borderWidth: 4,
  },
  nodeLocked: {
    opacity: 0.55,
  },
})
