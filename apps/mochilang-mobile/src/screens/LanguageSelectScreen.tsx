import { useEffect, useMemo, useState } from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  api,
  ApiError,
  buildCourseId,
  findLanguage,
  parseCourseId,
  type CourseSummary,
} from '@mochilang/shared'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BUNDLED_COURSE_IDS } from '../data/courseBundles'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  initialCourseId?: string | null
  onSelect: (courseId: string) => void
  onCancel?: () => void
}

/**
 * Mobile from/to picker — RN port of the web LanguageSelectScreen. Two
 * vertical lists side-by-side: "I speak" (source) and "I want to learn"
 * (target). Choices come from /api/content/courses with a fallback to
 * the courses Metro bundled at build time.
 */
export default function LanguageSelectScreen({
  initialCourseId,
  onSelect,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets()
  const [courses, setCourses] = useState<CourseSummary[]>(() => fallbackCourses())

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await api.listCourses(ctrl.signal)
        if (r.courses.length > 0) setCourses(r.courses)
      } catch (err) {
        if (err instanceof ApiError) return
        // Network failure — keep the bundled list.
      }
    })()
    return () => ctrl.abort()
  }, [])

  const initial = useMemo(() => {
    const parsed = initialCourseId ? parseCourseId(initialCourseId) : null
    if (parsed) return parsed
    const first = courses[0]
    return first ? parseCourseId(first.id) ?? { source: 'en', target: 'zh' } : { source: 'en', target: 'zh' }
  }, [initialCourseId, courses])

  const [source, setSource] = useState(initial.source)
  const [target, setTarget] = useState(initial.target)

  useEffect(() => {
    setSource(initial.source)
    setTarget(initial.target)
  }, [initial.source, initial.target])

  const sources = useMemo(
    () => unique(courses.map((c) => parseCourseId(c.id)?.source).filter(Boolean) as string[]),
    [courses]
  )
  const targetsForSource = useMemo(
    () =>
      unique(
        courses
          .map((c) => parseCourseId(c.id))
          .filter((p): p is { target: string; source: string } => p !== null)
          .filter((p) => p.source === source)
          .map((p) => p.target)
      ),
    [courses, source]
  )

  useEffect(() => {
    if (targetsForSource.length === 0) return
    if (!targetsForSource.includes(target)) setTarget(targetsForSource[0])
  }, [source, targetsForSource, target])

  const canContinue = source && target && source !== target
  const courseId = canContinue ? buildCourseId(target, source) : null

  return (
    <ScrollView
      style={styles.shell}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.lg },
      ]}
    >
      <View style={styles.hero}>
        <Image source={require('../../assets/mochi-main-transparent.png')} style={styles.mochi} />
        <Text style={styles.title}>Welcome to MochiLang</Text>
        <Text style={styles.tagline}>Mochi the hedgehog will guide your journey.</Text>
      </View>

      <View style={styles.columns}>
        <Column heading="I speak" codes={sources} selected={source} onSelect={setSource} />
        <Column
          heading="I want to learn"
          codes={targetsForSource}
          selected={target}
          onSelect={setTarget}
          emptyHint={
            targetsForSource.length === 0 ? 'No courses for this source yet' : undefined
          }
        />
      </View>

      <View style={styles.continueRow}>
        <LedgeButton
          label="Start learning"
          tone="primary"
          size="lg"
          disabled={!canContinue}
          onPress={() => courseId && onSelect(courseId)}
        />
        {onCancel && (
          <TouchableOpacity style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

interface ColumnProps {
  heading: string
  codes: string[]
  selected: string
  onSelect: (code: string) => void
  emptyHint?: string
}

function Column({ heading, codes, selected, onSelect, emptyHint }: ColumnProps) {
  return (
    <View style={styles.column}>
      <Text style={styles.columnHeading}>{heading}</Text>
      {emptyHint ? (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>{emptyHint}</Text>
        </View>
      ) : (
        codes.map((code) => {
          const info = findLanguage(code)
          const flag = info?.flag ?? '🏳️'
          const name = info?.name ?? code.toUpperCase()
          const native = info?.nativeName
          const active = code === selected
          return (
            <TouchableOpacity
              key={code}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => onSelect(code)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowFlag}>{flag}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{name}</Text>
                {native && native !== name && <Text style={styles.rowNative}>{native}</Text>}
              </View>
            </TouchableOpacity>
          )
        })
      )}
    </View>
  )
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs))
}

function fallbackCourses(): CourseSummary[] {
  return BUNDLED_COURSE_IDS.map((id) => ({ id, levels: [], topicCount: 0 }))
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.xl },
  hero: { alignItems: 'center', gap: space.sm },
  mochi: { width: 120, height: 120, resizeMode: 'contain' },
  title: { fontSize: fontSizes.hero, fontWeight: '900', color: colors.text },
  tagline: { fontSize: fontSizes.md, color: colors.textMuted, textAlign: 'center' },
  columns: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  column: { flex: 1, gap: space.sm },
  columnHeading: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.md,
  },
  rowActive: {
    borderColor: colors.primary500,
    backgroundColor: colors.cream100,
  },
  rowFlag: { fontSize: 22 },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: fontSizes.sm, color: colors.text, fontWeight: '800' },
  rowNative: { fontSize: fontSizes.xs, color: colors.textSubtle },
  emptyHint: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
  },
  emptyHintText: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  continueRow: {
    alignItems: 'center',
    gap: space.md,
  },
  cancel: { paddingVertical: space.sm },
  cancelText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.md },
})
