import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  api,
  ApiError,
  findLanguage,
  type CommunityComment,
  type CommunityPack,
  type CommunityReportReason,
} from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  packId: string
  onBack: () => void
  /** Switches the active course to this pack and pops to the home tab. */
  onStartPack: (packId: string) => void
}

/**
 * Pack detail — title + author + lessons preview + rate + comments +
 * report. Start button hands the pack id back to the parent navigator
 * which sets it as the active courseId (community:<id>) so the tabs +
 * lesson flow render it through the existing path.
 */
export default function CommunityPackScreen({ packId, onBack, onStartPack }: Props) {
  const insets = useSafeAreaInsets()
  const [pack, setPack] = useState<CommunityPack | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.community.get(packId),
        api.community.listComments(packId),
      ])
      setPack(p)
      setComments(c.comments)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert('Not found', 'This pack is no longer available.')
        onBack()
      }
    } finally {
      setLoading(false)
    }
  }, [packId, onBack])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleRate(stars: number) {
    if (!pack) return
    setBusy(true)
    try {
      const r = await api.community.rate(packId, stars)
      setPack({ ...pack, rating: r.rating, userRating: r.userRating })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert('Sign in required', 'You need to be signed in to rate.')
      } else {
        Alert.alert('Couldn’t save rating', extractError(err))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handlePostComment() {
    const body = commentDraft.trim()
    if (!body) return
    setBusy(true)
    try {
      await api.community.comment(packId, body)
      setCommentDraft('')
      void reload()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert('Sign in required', 'You need to be signed in to comment.')
      } else {
        Alert.alert('Couldn’t post comment', extractError(err))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleReport(reason: CommunityReportReason) {
    setReportOpen(false)
    setBusy(true)
    try {
      await api.community.report(packId, reason)
      Alert.alert('Thanks', 'This pack has been reported. We’ll take a look.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert('Sign in required', 'You need to be signed in to report.')
      } else {
        Alert.alert('Couldn’t submit report', extractError(err))
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading || !pack) {
    return (
      <View style={[styles.shell, styles.center, { paddingTop: insets.top + space.lg }]}>
        <ActivityIndicator />
      </View>
    )
  }

  const src = findLanguage(pack.sourceLang)
  const tgt = findLanguage(pack.targetLang)
  const totalLessons = pack.level.topics.reduce((n, t) => n + t.lessons.length, 0)

  return (
    <View style={styles.shell}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setReportOpen(true)} hitSlop={12}>
            <Text style={styles.reportLink}>⚑ Report</Text>
          </TouchableOpacity>
        </View>

        {pack.hidden && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>
              This pack has been hidden from public listings due to user reports.
            </Text>
          </View>
        )}

        <View style={styles.langsRow}>
          <Text style={styles.lang}>
            {src?.flag ?? '🏳️'} {pack.sourceLang.toUpperCase()}
          </Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.lang}>
            {tgt?.flag ?? '🏳️'} {pack.targetLang.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.title}>{pack.title}</Text>
        <Text style={styles.author}>
          by {pack.author.handle ? '@' + pack.author.handle : pack.author.name || 'anonymous'}
        </Text>
        {pack.description ? <Text style={styles.desc}>{pack.description}</Text> : null}

        <View style={styles.statsRow}>
          <Stat label="Topics" value={pack.level.topics.length} />
          <Stat label="Lessons" value={totalLessons} />
          <Stat
            label="Rating"
            value={
              pack.rating.count > 0
                ? `${pack.rating.average.toFixed(1)} ★ (${pack.rating.count})`
                : '—'
            }
          />
        </View>

        <LedgeButton
          label="Start studying"
          tone="primary"
          size="lg"
          onPress={() => onStartPack(packId)}
        />

        <Text style={styles.sectionTitle}>Your rating</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Pressable
              key={s}
              onPress={() => handleRate(s)}
              disabled={busy}
              hitSlop={6}
            >
              <Text
                style={[
                  styles.star,
                  s <= pack.userRating ? styles.starOn : styles.starOff,
                ]}
              >
                ★
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>

        <View style={styles.commentForm}>
          <TextInput
            value={commentDraft}
            onChangeText={setCommentDraft}
            placeholder="Say something nice…"
            placeholderTextColor={colors.textSubtle}
            multiline
            style={styles.commentInput}
            maxLength={1000}
          />
          <LedgeButton
            label="Post"
            tone="success"
            disabled={!commentDraft.trim() || busy}
            onPress={() => void handlePostComment()}
          />
        </View>

        {comments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No comments yet.</Text>
          </View>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Text style={styles.commentAuthor}>
                {c.author.handle ? '@' + c.author.handle : c.author.name || 'anonymous'}
              </Text>
              <Text style={styles.commentBody}>{c.body}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={reportOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReportOpen(false)}
      >
        <ReportSheet onPick={handleReport} onCancel={() => setReportOpen(false)} />
      </Modal>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const REPORT_REASONS: { value: CommunityReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'offensive', label: 'Offensive' },
  { value: 'copied_content', label: 'Copied content' },
  { value: 'low_quality', label: 'Low quality' },
  { value: 'incorrect', label: 'Incorrect / misleading' },
  { value: 'other', label: 'Other' },
]

function ReportSheet({
  onPick,
  onCancel,
}: {
  onPick: (reason: CommunityReportReason) => void
  onCancel: () => void
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.reportBackdrop}>
      <View style={[styles.reportSheet, { paddingBottom: insets.bottom + space.lg }]}>
        <Text style={styles.reportTitle}>Report this pack</Text>
        {REPORT_REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={styles.reportRow}
            onPress={() => onPick(r.value)}
          >
            <Text style={styles.reportRowText}>{r.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.reportCancel} onPress={onCancel}>
          <Text style={styles.reportCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function extractError(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLink: { color: colors.textMuted, fontWeight: '800', fontSize: fontSizes.sm },
  reportLink: { color: colors.error700, fontWeight: '800', fontSize: fontSizes.sm },
  warnBanner: {
    backgroundColor: colors.error100,
    borderRadius: radius.md,
    padding: space.md,
  },
  warnText: { color: colors.error700, fontWeight: '700', fontSize: fontSizes.sm },
  langsRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lang: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
  arrow: { color: colors.textMuted, fontSize: fontSizes.sm },
  title: { fontSize: fontSizes.hero, fontWeight: '900', color: colors.text },
  author: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: '700' },
  desc: { fontSize: fontSizes.md, color: colors.text, lineHeight: 22 },
  statsRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'center',
  },
  statValue: { fontWeight: '900', color: colors.text, fontSize: fontSizes.md },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    color: colors.textSubtle,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: space.lg,
  },
  starsRow: { flexDirection: 'row', gap: space.sm },
  star: { fontSize: 36 },
  starOn: { color: colors.xp500 },
  starOff: { color: colors.border },
  commentForm: { gap: space.sm },
  commentInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 80,
    color: colors.text,
    textAlignVertical: 'top',
  },
  empty: {
    padding: space.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  emptyText: { color: colors.textSubtle, textAlign: 'center' },
  commentRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentAuthor: { fontWeight: '900', color: colors.text, fontSize: fontSizes.sm },
  commentBody: { color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 },
  reportBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  reportSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  reportTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '900',
    color: colors.text,
    marginBottom: space.sm,
  },
  reportRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reportRowText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },
  reportCancel: { paddingVertical: 14, alignItems: 'center' },
  reportCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSizes.md },
})
