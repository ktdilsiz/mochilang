import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  api,
  ApiError,
  findLanguage,
  LANGUAGES_REGISTRY,
  type CommunityPackSummary,
} from '@mochilang/shared'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  onBack: () => void
  onOpenPack: (packId: string) => void
  onSubmit: () => void
}

/**
 * Browse community-authored packs. Two optional filter chips (source +
 * target language) and a submit CTA in the header. No sort UI yet — the
 * server returns newest-first which is the right default for a young
 * catalog.
 */
export default function CommunityListScreen({
  onBack,
  onOpenPack,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets()
  const [packs, setPacks] = useState<CommunityPackSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [source, setSource] = useState<string | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const [picker, setPicker] = useState<'source' | 'target' | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setErrored(false)
    void (async () => {
      try {
        const r = await api.community.list(
          { source: source ?? undefined, target: target ?? undefined },
          ctrl.signal
        )
        setPacks(r.packs)
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) {
          // offline — show empty state with a retry hint
          setErrored(true)
        } else if (err instanceof ApiError) {
          setErrored(true)
        }
      } finally {
        setLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [source, target])

  return (
    <ScrollView
      style={styles.shell}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Community Lessons</Text>
        <TouchableOpacity onPress={onSubmit} hitSlop={12}>
          <Text style={styles.submitLink}>＋ Submit</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.tagline}>
        Lessons built by other learners. Tap any pack to study, rate, or report.
      </Text>

      <FilterRow
        label="Source"
        value={source}
        onClear={() => setSource(null)}
        onPress={() => setPicker('source')}
      />
      <FilterRow
        label="Target"
        value={target}
        onClear={() => setTarget(null)}
        onPress={() => setPicker('target')}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : errored ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Couldn't reach the community service. Check your network and try again.
          </Text>
        </View>
      ) : packs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No packs yet for this language pair. Be the first — tap Submit above.
          </Text>
        </View>
      ) : (
        packs.map((p) => <PackCard key={p.id} pack={p} onPress={() => onOpenPack(p.id)} />)
      )}

      <Modal
        visible={picker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <LanguagePickerSheet
          heading={picker === 'source' ? 'Source language' : 'Target language'}
          selected={picker === 'source' ? source : target}
          onCancel={() => setPicker(null)}
          onPick={(code) => {
            if (picker === 'source') setSource(code)
            else if (picker === 'target') setTarget(code)
            setPicker(null)
          }}
        />
      </Modal>
    </ScrollView>
  )
}

interface FilterRowProps {
  label: string
  value: string | null
  onClear: () => void
  onPress: () => void
}

function FilterRow({ label, value, onClear, onPress }: FilterRowProps) {
  const info = value ? findLanguage(value) : null
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity style={styles.filterChip} onPress={onPress} activeOpacity={0.7}>
        {value ? (
          <>
            <Text style={styles.filterFlag}>{info?.flag ?? '🏳️'}</Text>
            <Text style={styles.filterValue}>{info?.name ?? value.toUpperCase()}</Text>
          </>
        ) : (
          <Text style={styles.filterValue}>Any</Text>
        )}
      </TouchableOpacity>
      {value && (
        <TouchableOpacity onPress={onClear} hitSlop={8}>
          <Text style={styles.filterClear}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

interface LanguagePickerSheetProps {
  heading: string
  /** Currently-selected code, or null for "Any". */
  selected: string | null
  onPick: (code: string | null) => void
  onCancel: () => void
}

/**
 * Bottom-sheet language picker. Lists every entry in LANGUAGES_REGISTRY
 * with flag + English + native name, plus an "Any language" row at the
 * top that clears the filter. Tapping a row picks it and closes the
 * sheet; the backdrop dismisses without changing the selection.
 */
function LanguagePickerSheet({
  heading,
  selected,
  onPick,
  onCancel,
}: LanguagePickerSheetProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.sheetBackdrop}>
      <TouchableOpacity
        style={styles.sheetDismiss}
        activeOpacity={1}
        onPress={onCancel}
      />
      <View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + space.md, paddingTop: space.md },
        ]}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetHeading}>{heading}</Text>
        <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent}>
          <SheetRow
            flag="🌐"
            name="Any language"
            nativeName={null}
            active={selected === null}
            onPress={() => onPick(null)}
          />
          {LANGUAGES_REGISTRY.map((lang) => (
            <SheetRow
              key={lang.code}
              flag={lang.flag}
              name={lang.name}
              nativeName={lang.nativeName !== lang.name ? lang.nativeName : null}
              active={lang.code === selected}
              onPress={() => onPick(lang.code)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

interface SheetRowProps {
  flag: string
  name: string
  nativeName: string | null
  active: boolean
  onPress: () => void
}

function SheetRow({ flag, name, nativeName, active, onPress }: SheetRowProps) {
  return (
    <TouchableOpacity
      style={[styles.sheetRow, active && styles.sheetRowActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.sheetFlag}>{flag}</Text>
      <View style={styles.sheetRowText}>
        <Text style={styles.sheetName}>{name}</Text>
        {nativeName && <Text style={styles.sheetNative}>{nativeName}</Text>}
      </View>
      {active && <Text style={styles.sheetCheck}>✓</Text>}
    </TouchableOpacity>
  )
}

interface PackCardProps {
  pack: CommunityPackSummary
  onPress: () => void
}

function PackCard({ pack, onPress }: PackCardProps) {
  const src = findLanguage(pack.sourceLang)
  const tgt = findLanguage(pack.targetLang)
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardLangsRow}>
        <Text style={styles.cardLang}>
          {src?.flag ?? '🏳️'} {pack.sourceLang.toUpperCase()}
        </Text>
        <Text style={styles.cardArrow}>→</Text>
        <Text style={styles.cardLang}>
          {tgt?.flag ?? '🏳️'} {pack.targetLang.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.cardTitle}>{pack.title}</Text>
      {pack.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {pack.description}
        </Text>
      ) : null}
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardAuthor}>
          by {pack.author.handle ? '@' + pack.author.handle : pack.author.name || 'anonymous'}
        </Text>
        <Text style={styles.cardRating}>
          {pack.rating.count > 0
            ? `★ ${pack.rating.average.toFixed(1)} (${pack.rating.count})`
            : 'unrated'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLink: { color: colors.textMuted, fontWeight: '800', fontSize: fontSizes.sm },
  submitLink: { color: colors.primary700, fontWeight: '900', fontSize: fontSizes.sm },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '900',
    color: colors.text,
  },
  tagline: { fontSize: fontSizes.sm, color: colors.textMuted },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  filterLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontWeight: '800',
    width: 56,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterFlag: { fontSize: 18 },
  filterValue: { fontWeight: '800', color: colors.text, fontSize: fontSizes.sm },
  filterClear: { fontSize: 20, color: colors.textMuted, paddingHorizontal: 4 },
  center: { padding: space.xl, alignItems: 'center' },
  empty: {
    padding: space.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.md,
    gap: 6,
  },
  cardLangsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  cardLang: { fontSize: fontSizes.sm, fontWeight: '800', color: colors.text },
  cardArrow: { color: colors.textMuted, fontSize: fontSizes.sm },
  cardTitle: { fontSize: fontSizes.lg, fontWeight: '900', color: colors.text },
  cardDesc: { fontSize: fontSizes.sm, color: colors.textMuted },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardAuthor: { fontSize: fontSizes.xs, color: colors.textSubtle, fontWeight: '700' },
  cardRating: { fontSize: fontSizes.xs, color: colors.text, fontWeight: '900' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetDismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '75%',
    paddingHorizontal: space.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: space.sm,
  },
  sheetHeading: {
    fontSize: fontSizes.lg,
    fontWeight: '900',
    color: colors.text,
    marginBottom: space.sm,
  },
  sheetList: { flexGrow: 0 },
  sheetListContent: { paddingBottom: space.md, gap: space.xs },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 12,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sheetRowActive: {
    backgroundColor: colors.cream100,
  },
  sheetFlag: { fontSize: 22 },
  sheetRowText: { flex: 1, gap: 2 },
  sheetName: { fontSize: fontSizes.md, color: colors.text, fontWeight: '800' },
  sheetNative: { fontSize: fontSizes.xs, color: colors.textSubtle },
  sheetCheck: { fontSize: 20, color: colors.primary500, fontWeight: '900' },
})

