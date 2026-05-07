import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  title: string
  emoji: string
  body?: string
}

/**
 * Placeholder screen for tabs that haven't been ported yet (League,
 * Friends, Profile in Phase 1). Lands a real implementation in Phase 2.
 */
export default function StubScreen({ title, emoji, body }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.shell}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        <Text style={styles.tag}>Phase 2</Text>
        <Text style={styles.body}>
          {body ??
            'This screen will be ported next. The web version has it; the RN version is on the way.'}
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  shell: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
    backgroundColor: colors.bg,
  },
  emoji: { fontSize: 64 },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
    maxWidth: 360,
  },
  tag: {
    fontSize: fontSizes.xs,
    fontWeight: '900',
    color: colors.primary700,
    backgroundColor: colors.primary100,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 22,
  },
})
