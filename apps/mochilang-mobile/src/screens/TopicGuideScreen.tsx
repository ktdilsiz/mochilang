import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { GuideExample, GuideSection, Topic } from '@mochilang/shared'
import { speak } from '../lib/tts'
import { colors, fontSizes, radius, space, tintForTheme } from '../lib/theme'
import LedgeButton from '../components/LedgeButton'

interface Props {
  topic: Topic
  onBack: () => void
}

/**
 * RN port of the web TopicGuideScreen. Renders a topic's long-form guide
 * (intro + structured sections) with the topic-themed sticky header.
 *
 * Tables are tricky in RN — there's no native <table>, so we render a
 * View grid wrapped in a horizontal ScrollView. Cells use a fixed
 * minimum column width so wide tables scroll horizontally rather than
 * mash text into vertical noodles. Long cell text wraps within the
 * column.
 */
export default function TopicGuideScreen({ topic, onBack }: Props) {
  if (!topic.guide) return null
  const { intro, sections } = topic.guide
  const tint = tintForTheme(topic.theme)

  return (
    <View style={styles.shell}>
      <View
        style={[
          styles.topbar,
          {
            backgroundColor: tint.bg,
            borderBottomColor: tint.edge,
          },
        ]}
      >
        <Pressable
          onPress={onBack}
          accessibilityLabel="Back"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backBtn,
            { borderColor: tint.edge },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.backArrow, { color: tint.fg }]}>←</Text>
        </Pressable>
        <View style={styles.topbarTitle}>
          <Text style={[styles.eyebrow, { color: tint.fg }]}>NOTES</Text>
          <Text
            style={[styles.topbarName, { color: tint.fg }]}
            numberOfLines={2}
          >
            {topic.title}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.article}>
        {intro ? (
          <View style={styles.introCard}>
            <Text style={styles.introText}>{intro}</Text>
          </View>
        ) : null}
        {sections.map((s, i) => (
          <Section key={i} section={s} />
        ))}

        <View style={styles.cta}>
          <LedgeButton tone="primary" size="lg" label="Back to lessons" onPress={onBack} />
        </View>
      </ScrollView>
    </View>
  )
}

function Section({ section }: { section: GuideSection }) {
  switch (section.kind) {
    case 'heading':
      return <Text style={styles.heading}>{section.text}</Text>
    case 'paragraph':
      return <Text style={styles.paragraph}>{section.text}</Text>
    case 'list':
      return (
        <View style={styles.list}>
          {section.items.map((it, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listBullet}>•</Text>
              <Text style={styles.listItem}>{it}</Text>
            </View>
          ))}
        </View>
      )
    case 'examples':
      return <ExamplesBlock rows={section.rows} />
    case 'callout':
      return <Callout tone={section.tone} text={section.text} />
    case 'table':
      return <TableBlock headers={section.headers} rows={section.rows} />
  }
}

function ExamplesBlock({ rows }: { rows: GuideExample[] }) {
  return (
    <View style={styles.examples}>
      {rows.map((r, i) => (
        <View key={i} style={styles.example}>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleSource}>{r.source}</Text>
            <Pressable
              onPress={() => {
                speak(r.source)
              }}
              accessibilityLabel={`Play "${r.source}"`}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.listenBtn,
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
            >
              <Text style={styles.listenIcon}>🔊</Text>
            </Pressable>
          </View>
          {r.pinyin ? <Text style={styles.examplePinyin}>{r.pinyin}</Text> : null}
          <Text style={styles.exampleTranslation}>{r.translation}</Text>
        </View>
      ))}
    </View>
  )
}

type CalloutTone = 'tip' | 'warn' | 'note' | 'common_mistake'

const calloutPalette: Record<
  CalloutTone,
  { bg: string; border: string; fg: string; icon: string; dashed?: boolean }
> = {
  tip: {
    bg: '#fff8e0',
    border: colors.xp500,
    fg: '#6b5300',
    icon: '💡',
  },
  warn: {
    bg: colors.error100,
    border: colors.error500,
    fg: colors.error700,
    icon: '⚠️',
  },
  note: {
    bg: colors.surfaceAlt,
    border: colors.textSubtle,
    fg: colors.text,
    icon: '📌',
  },
  common_mistake: {
    bg: '#ffeceb',
    border: colors.error500,
    fg: colors.error700,
    icon: '🚫',
    dashed: true,
  },
}

function Callout({ tone, text }: { tone?: CalloutTone; text: string }) {
  const t: CalloutTone = tone ?? 'note'
  const p = calloutPalette[t]
  return (
    <View
      style={[
        styles.callout,
        {
          backgroundColor: p.bg,
          borderLeftColor: p.border,
          // RN's borderStyle applies to all sides; we only have borderLeftWidth
          // set so the dashed treatment only renders on the left edge.
          borderStyle: p.dashed ? 'dashed' : 'solid',
        },
      ]}
    >
      <Text style={styles.calloutIcon}>{p.icon}</Text>
      <Text style={[styles.calloutText, { color: p.fg }]}>{text}</Text>
    </View>
  )
}

function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  // Wide tables horizontally scroll; columns have a fixed min width so cells
  // don't squish together. Cell text wraps within the column.
  const colWidth = 120
  return (
    <View style={styles.tableWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.tableHeaderRow}>
            {headers.map((h, i) => (
              <View
                key={i}
                style={[styles.tableCell, styles.tableHeaderCell, { width: colWidth }]}
              >
                <Text style={styles.tableHeaderText}>{h}</Text>
              </View>
            ))}
          </View>
          {rows.map((r, ri) => (
            <View
              key={ri}
              style={[
                styles.tableRow,
                ri === rows.length - 1 && styles.tableRowLast,
              ]}
            >
              {r.map((cell, ci) => (
                <View key={ci} style={[styles.tableCell, { width: colWidth }]}>
                  <Text style={styles.tableCellText}>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  topbarTitle: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    opacity: 0.85,
  },
  topbarName: {
    fontSize: fontSizes.xl,
    fontWeight: '900',
    marginTop: 1,
    letterSpacing: -0.2,
  },

  article: {
    padding: space.lg,
    paddingBottom: 60,
    gap: 14,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },

  introCard: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary500,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
  },
  introText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 24,
  },

  heading: {
    fontSize: fontSizes.xl,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.2,
    marginTop: 14,
  },
  paragraph: {
    fontSize: fontSizes.lg,
    color: colors.text,
    lineHeight: 24,
  },

  list: {
    gap: 6,
    paddingLeft: 4,
  },
  listRow: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
  },
  listBullet: {
    fontSize: fontSizes.lg,
    color: colors.text,
    lineHeight: 24,
    width: 14,
  },
  listItem: {
    flex: 1,
    fontSize: fontSizes.lg,
    color: colors.text,
    lineHeight: 24,
  },

  examples: {
    gap: 8,
  },
  example: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  exampleSource: {
    flex: 1,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.4,
    lineHeight: 26,
  },
  listenBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenIcon: {
    fontSize: 14,
  },
  examplePinyin: {
    marginTop: 2,
    fontSize: fontSizes.sm,
    color: colors.textSubtle,
    fontStyle: 'italic',
  },
  exampleTranslation: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
  },

  callout: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderLeftWidth: 4,
  },
  calloutIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  calloutText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  tableWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    backgroundColor: colors.surfaceAlt,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tableCellText: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 20,
  },

  cta: {
    marginTop: 20,
  },
})
