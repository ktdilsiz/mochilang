import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  type Level,
  LEVEL_EXAM_PASS_THRESHOLD,
  LEVEL_EXAM_QUESTION_COUNT,
} from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  level: Level
  onStart: () => void
  onCancel: () => void
}

/**
 * Pre-exam intro for the level-skip flow. Mirrors the web version's
 * content. Displayed as a presented modal (App.tsx wires the Stack
 * screen with `presentation: 'modal'`), so the X in the top-left
 * dismisses back to home.
 */
export default function LevelExamIntroScreen({ level, onStart, onCancel }: Props) {
  const requiredCorrect = Math.ceil(
    LEVEL_EXAM_PASS_THRESHOLD * LEVEL_EXAM_QUESTION_COUNT
  )
  const passPercent = Math.round(LEVEL_EXAM_PASS_THRESHOLD * 100)

  const bullets: { icon: string; text: React.ReactNode }[] = [
    {
      icon: '📝',
      text: (
        <Text style={styles.bulletText}>
          <Text style={styles.bold}>{LEVEL_EXAM_QUESTION_COUNT} questions</Text>
          , drawn from the synthesis lesson of every topic in {level.name}.
        </Text>
      ),
    },
    {
      icon: '🎯',
      text: (
        <Text style={styles.bulletText}>
          Need{' '}
          <Text style={styles.bold}>
            {requiredCorrect} / {LEVEL_EXAM_QUESTION_COUNT}
          </Text>{' '}
          correct ({passPercent}%) to pass.
        </Text>
      ),
    },
    {
      icon: '⚖️',
      text: (
        <Text style={styles.bulletText}>
          Questions weight toward{' '}
          <Text style={styles.bold}>later topics</Text> — the hard, latter-half
          material decides it.
        </Text>
      ),
    },
    {
      icon: '🔁',
      text: (
        <Text style={styles.bulletText}>
          Fresh randomized deck on every attempt — retries are free.
        </Text>
      ),
    },
    {
      icon: '✨',
      text: (
        <Text style={styles.bulletText}>
          Pass and the next level unlocks immediately. Lessons inside{' '}
          {level.name} stay open if you want to come back for review XP.
        </Text>
      ),
    },
  ]

  return (
    <View style={styles.shell}>
      <View style={styles.topbar}>
        <Pressable onPress={onCancel} style={styles.x} hitSlop={12}>
          <Text style={styles.xText}>×</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Image
          source={require('../../assets/mochi-thinking.png')}
          style={styles.mochi}
        />
        <Text style={styles.eyebrow}>Level placement exam</Text>
        <Text style={styles.title}>Skip {level.name}?</Text>
        <Text style={styles.tagline}>
          Pass once and the entire level is yours. {level.description}
        </Text>

        <View style={styles.bullets}>
          {bullets.map((b, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={styles.bulletIcon}>{b.icon}</Text>
              <View style={{ flex: 1 }}>{b.text}</View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <LedgeButton label="Start exam" tone="primary" size="lg" onPress={onStart} />
        <LedgeButton label="Maybe later" tone="neutral" onPress={onCancel} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    paddingHorizontal: space.md,
    paddingTop: space.xl + space.lg,
    paddingBottom: space.sm,
  },
  x: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xText: { fontSize: 24, fontWeight: '900', color: colors.textMuted },
  body: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    alignItems: 'center',
    gap: space.sm,
  },
  mochi: { width: 144, height: 144, resizeMode: 'contain', marginTop: 4 },
  eyebrow: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fontSizes.hero - 4,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.5,
    maxWidth: 420,
    marginBottom: space.md,
  },
  bullets: {
    gap: space.sm,
    width: '100%',
    maxWidth: 440,
  },
  bullet: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  bulletIcon: {
    fontSize: 22,
    lineHeight: 24,
  },
  bulletText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: fontSizes.sm * 1.45,
  },
  bold: {
    fontFamily: 'Nunito_900Black',
  },
  footer: {
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.sm,
  },
})
