import { useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  MOCHI_ROSTER,
  MOCHI_ROSTER_SIZE,
  type MochiSpec,
  countUnlockedMochis,
  nextMochi,
} from '@mochilang/shared'
import { useCourse } from '../state/useCourse'
import { useLevelExams } from '../state/useLevelExams'
import { useProgress } from '../state/useProgress'
import { useSettings } from '../state/useSettings'
import {
  type PlacementOverrides,
  useVillagePlacements,
} from '../state/useVillagePlacements'
import { useVillageVisits } from '../state/useVillageVisits'
import { useT } from '../lib/i18n'
import { MOCHI_SPRITES } from '../data/mochiSprites'
import { VILLAGE_POSITIONS } from '../data/villagePositions'
import { formatVisitWindow, nextArrival } from '../data/villageSchedule'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  courseId: string
}

/**
 * Mochi Village — horizontal panorama of the painted village with the
 * mochi sprites laid on top.
 *
 * Default placement comes from VILLAGE_POSITIONS (hand-curated at
 * landmarks). Each user can override per-mochi via the in-app menu:
 *   - Tap a mochi → action sheet (Move / Hide / About).
 *   - "Move" enters placement mode; tapping anywhere on the panorama
 *     drops the mochi at that point.
 *   - "Hide" removes the sprite from the panorama; it can be brought
 *     back from the top-right Atlas button.
 *   - "About" shows name / flavor / unlock XP / status.
 * Top-right Atlas button shows the full 119-mochi roster with
 * locked/visible/hidden state and unhide controls.
 *
 * Overrides persist in AsyncStorage (see useVillagePlacements). Server
 * sync can be added later by swapping the hook's backing store.
 */
const IMAGE_ASPECT = 2172 / 724
const SPRITE_HEIGHT = 56

interface ResolvedPosition {
  x: number
  y: number
  hidden: boolean
}

function resolvePosition(
  index: number,
  overrides: PlacementOverrides
): ResolvedPosition | null {
  const override = overrides[index]
  if (override?.hidden) return { x: 0, y: 0, hidden: true }
  const base = VILLAGE_POSITIONS[index]
  if (!base) return null
  return {
    x: override?.x ?? base.x,
    y: override?.y ?? base.y,
    hidden: false,
  }
}

function displayNameFor(mochi: MochiSpec, overrides: PlacementOverrides): string {
  const custom = overrides[mochi.index]?.name
  if (custom && custom.length > 0) return custom
  return `Mochi the ${mochi.archetype.role}`
}

export default function VillageScreen({ courseId }: Props) {
  const insets = useSafeAreaInsets()
  const course = useCourse(courseId)
  const levelExams = useLevelExams()
  const progress = useProgress()
  const { state: settings } = useSettings()
  const placements = useVillagePlacements()
  const visits = useVillageVisits()
  const t = useT()
  const devMode = settings.developerMode
  const [viewportHeight, setViewportHeight] = useState(0)
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [aboutFor, setAboutFor] = useState<number | null>(null)
  const [renameFor, setRenameFor] = useState<number | null>(null)
  const [atlasOpen, setAtlasOpen] = useState(false)

  // Drag-to-move state. While `draggingIndex` is set the sprite at
  // that slot is rendered with a PanResponder; everything else dims
  // and ScrollView scroll is frozen so the gesture stays under the
  // finger. `dragOffset` is the pixel delta from the sprite's base
  // position, and is the single source of truth for the in-flight
  // visual position. Confirm reads it; cancel clears it.
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Refs keep the PanResponder's stable closure in sync with state.
  // dragOffsetRef mirrors dragOffset so a fresh gesture can snapshot
  // the current offset at grant time. gestureBaselineRef holds that
  // snapshot so each move-event resets relative to where the gesture
  // started — guarantees a clean drop, no race with React batching.
  const dragOffsetRef = useRef(dragOffset)
  dragOffsetRef.current = dragOffset
  const gestureBaselineRef = useRef({ x: 0, y: 0 })

  function handleLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height
    if (h !== viewportHeight) setViewportHeight(h)
  }

  const panoramaWidth = viewportHeight * IMAGE_ASPECT
  const totalXp = progress.state.totalXp
  const unlockedCount = useMemo(() => countUnlockedMochis(totalXp), [totalXp])
  const next = useMemo(() => nextMochi(totalXp), [totalXp])

  function startDragging(index: number) {
    setDraggingIndex(index)
    setDragOffset({ x: 0, y: 0 })
    dragOffsetRef.current = { x: 0, y: 0 }
    gestureBaselineRef.current = { x: 0, y: 0 }
  }

  function cancelDragging() {
    setDraggingIndex(null)
    setDragOffset({ x: 0, y: 0 })
    dragOffsetRef.current = { x: 0, y: 0 }
    gestureBaselineRef.current = { x: 0, y: 0 }
  }

  function confirmDragging() {
    if (draggingIndex === null) return
    const base = resolvePosition(draggingIndex, placements.overrides)
    if (!base || panoramaWidth === 0 || viewportHeight === 0) {
      cancelDragging()
      return
    }
    const newX = Math.max(
      0.02,
      Math.min(0.98, base.x + dragOffset.x / panoramaWidth)
    )
    const newY = Math.max(
      0.05,
      Math.min(0.95, base.y + dragOffset.y / viewportHeight)
    )
    placements.move(draggingIndex, newX, newY)
    cancelDragging()
  }

  // Stable PanResponder via useRef. Each gesture snapshots the current
  // dragOffset into gestureBaselineRef on Grant; every Move writes
  // dragOffset = baseline + (g.dx, g.dy). Because the baseline is a
  // ref read synchronously inside the move callback, the rendered
  // position never depends on React's batched updates being applied
  // in any particular order. Drop = Release = no-op; dragOffset is
  // already correct.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gestureBaselineRef.current = { ...dragOffsetRef.current }
      },
      onPanResponderMove: (_e, g) => {
        const next = {
          x: gestureBaselineRef.current.x + g.dx,
          y: gestureBaselineRef.current.y + g.dy,
        }
        dragOffsetRef.current = next
        setDragOffset(next)
      },
    })
  ).current

  return (
    <View style={styles.shell}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>{t('village.title')}</Text>
          <View style={styles.headerRight}>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                {unlockedCount} / {MOCHI_ROSTER_SIZE}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Open mochi atlas"
              onPress={() => setAtlasOpen(true)}
              style={({ pressed }) => [
                styles.atlasButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.atlasButtonText}>📜</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {visits.visiting.size} visiting now ·{' '}
          {next
            ? t('village.subtitle.next', {
                xp: next.unlockXp,
                remaining: next.unlockXp - totalXp,
              })
            : t('village.subtitle.complete')}
        </Text>
      </View>

      {draggingIndex !== null && (
        <View style={styles.placingBanner}>
          <Text style={styles.placingBannerText}>
            Drag mochi #{draggingIndex + 1} to a new spot, then confirm.
          </Text>
          <View style={styles.placingButtons}>
            <Pressable
              onPress={cancelDragging}
              style={({ pressed }) => [
                styles.placingCancel,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.placingCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirmDragging}
              style={({ pressed }) => [
                styles.placingConfirm,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.placingConfirmText}>✓ Confirm</Text>
            </Pressable>
          </View>
        </View>
      )}

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
            // Freeze horizontal scroll while a drag is in flight so the
            // gesture isn't stolen mid-move.
            scrollEnabled={draggingIndex === null}
          >
            <ImageBackground
              source={require('../../assets/village-bg.png')}
              resizeMode="cover"
              style={{ width: panoramaWidth, height: viewportHeight }}
            >
              {/* Level signs along the top of the panorama. */}
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
                        <Text style={styles.signBadgeText}>
                          Level exam ✓
                        </Text>
                      </View>
                    )}
                  </View>
                )
              })}

              {MOCHI_ROSTER.map((mochi) => {
                const unlocked = devMode || totalXp >= mochi.unlockXp
                const sprite = MOCHI_SPRITES[mochi.index]
                const resolved = resolvePosition(
                  mochi.index,
                  placements.overrides
                )
                if (!sprite || !resolved || resolved.hidden) return null
                // Mochies are visitors — only render those currently
                // in the village (their daily window OR an active
                // invitation). devMode only bypasses the XP unlock
                // gate; visits still follow the schedule.
                if (!unlocked || !visits.visiting.has(mochi.index)) {
                  return null
                }
                const isDragging = draggingIndex === mochi.index
                const baseX = resolved.x * panoramaWidth
                const baseY = resolved.y * viewportHeight
                const x = baseX + (isDragging ? dragOffset.x : 0)
                const y = baseY + (isDragging ? dragOffset.y : 0)
                const dimmed = draggingIndex !== null && !isDragging

                if (isDragging) {
                  return (
                    <View
                      key={mochi.id}
                      {...panResponder.panHandlers}
                      style={[
                        styles.spriteWrap,
                        {
                          left: x - SPRITE_HEIGHT / 2,
                          top: y - SPRITE_HEIGHT,
                          width: SPRITE_HEIGHT,
                          height: SPRITE_HEIGHT,
                          zIndex: 50,
                          elevation: 50,
                        },
                      ]}
                    >
                      <Image
                        source={sprite}
                        resizeMode="contain"
                        style={[
                          styles.sprite,
                          !unlocked && styles.spriteLocked,
                          styles.spriteMoving,
                        ]}
                      />
                    </View>
                  )
                }

                return (
                  <Pressable
                    key={mochi.id}
                    onPress={() => {
                      if (draggingIndex !== null) return
                      setMenuFor(mochi.index)
                    }}
                    disabled={draggingIndex !== null}
                    style={[
                      styles.spriteWrap,
                      {
                        left: x - SPRITE_HEIGHT / 2,
                        top: y - SPRITE_HEIGHT,
                        width: SPRITE_HEIGHT,
                        height: SPRITE_HEIGHT,
                      },
                      dimmed && styles.spriteDimmed,
                    ]}
                  >
                    <Image
                      source={sprite}
                      resizeMode="contain"
                      style={[
                        styles.sprite,
                        !unlocked && styles.spriteLocked,
                      ]}
                    />
                  </Pressable>
                )
              })}
            </ImageBackground>
          </ScrollView>
        ) : null}
      </View>

      {/* Action menu — opens when a mochi is tapped. */}
      {menuFor !== null && (
        <ActionSheet
          mochi={MOCHI_ROSTER[menuFor]}
          displayName={
            MOCHI_ROSTER[menuFor]
              ? displayNameFor(MOCHI_ROSTER[menuFor], placements.overrides)
              : ''
          }
          unlocked={
            devMode || totalXp >= (MOCHI_ROSTER[menuFor]?.unlockXp ?? 0)
          }
          hidden={placements.overrides[menuFor]?.hidden === true}
          onMove={() => {
            startDragging(menuFor)
            setMenuFor(null)
          }}
          onRename={() => {
            setRenameFor(menuFor)
            setMenuFor(null)
          }}
          onToggleHide={() => {
            const idx = menuFor
            const isHidden = placements.overrides[idx]?.hidden === true
            if (isHidden) placements.unhide(idx)
            else placements.hide(idx)
            setMenuFor(null)
          }}
          onAbout={() => {
            setAboutFor(menuFor)
            setMenuFor(null)
          }}
          onResetPosition={() => {
            placements.resetOne(menuFor)
            setMenuFor(null)
          }}
          onClose={() => setMenuFor(null)}
        />
      )}

      {/* Rename modal */}
      {renameFor !== null && (
        <RenameSheet
          mochi={MOCHI_ROSTER[renameFor]}
          currentName={placements.overrides[renameFor]?.name ?? ''}
          onSave={(name) => {
            placements.rename(renameFor, name)
            setRenameFor(null)
          }}
          onResetName={() => {
            placements.rename(renameFor, '')
            setRenameFor(null)
          }}
          onClose={() => setRenameFor(null)}
        />
      )}

      {/* About card */}
      {aboutFor !== null && (
        <AboutCard
          mochi={MOCHI_ROSTER[aboutFor]}
          displayName={
            MOCHI_ROSTER[aboutFor]
              ? displayNameFor(MOCHI_ROSTER[aboutFor], placements.overrides)
              : ''
          }
          unlocked={
            devMode || totalXp >= (MOCHI_ROSTER[aboutFor]?.unlockXp ?? 0)
          }
          totalXp={totalXp}
          onClose={() => setAboutFor(null)}
        />
      )}

      {/* Atlas — full roster modal */}
      <AtlasModal
        visible={atlasOpen}
        totalXp={totalXp}
        devMode={devMode}
        overrides={placements.overrides}
        visits={visits}
        onClose={() => setAtlasOpen(false)}
        onShow={(idx) => placements.unhide(idx)}
        onHide={(idx) => placements.hide(idx)}
        onAbout={(idx) => {
          setAtlasOpen(false)
          setAboutFor(idx)
        }}
        onInvite={(idx) => visits.invite(idx)}
        onResetAll={() => placements.resetAll()}
      />
    </View>
  )
}

interface ActionSheetProps {
  mochi: MochiSpec | undefined
  displayName: string
  unlocked: boolean
  hidden: boolean
  onMove: () => void
  onRename: () => void
  onToggleHide: () => void
  onAbout: () => void
  onResetPosition: () => void
  onClose: () => void
}

function ActionSheet({
  mochi,
  displayName,
  unlocked,
  hidden,
  onMove,
  onRename,
  onToggleHide,
  onAbout,
  onResetPosition,
  onClose,
}: ActionSheetProps) {
  if (!mochi) return null
  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetGlyph}>{mochi.archetype.glyph}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>{displayName}</Text>
              <Text style={styles.sheetSubtitle}>#{mochi.index + 1}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.sheetActionPressed,
            ]}
            onPress={onMove}
            disabled={!unlocked || hidden}
          >
            <Text
              style={[
                styles.sheetActionText,
                (!unlocked || hidden) && styles.sheetActionDisabled,
              ]}
            >
              📍 Move
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.sheetActionPressed,
            ]}
            onPress={onRename}
            disabled={!unlocked}
          >
            <Text
              style={[
                styles.sheetActionText,
                !unlocked && styles.sheetActionDisabled,
              ]}
            >
              ✏️ Rename
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.sheetActionPressed,
            ]}
            onPress={onToggleHide}
            disabled={!unlocked}
          >
            <Text
              style={[
                styles.sheetActionText,
                !unlocked && styles.sheetActionDisabled,
              ]}
            >
              {hidden ? '👁 Show' : '🙈 Hide'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.sheetActionPressed,
            ]}
            onPress={onResetPosition}
            disabled={!unlocked}
          >
            <Text
              style={[
                styles.sheetActionText,
                !unlocked && styles.sheetActionDisabled,
              ]}
            >
              ↺ Reset position
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.sheetActionPressed,
            ]}
            onPress={onAbout}
          >
            <Text style={styles.sheetActionText}>ℹ About</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sheetCancel,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onClose}
          >
            <Text style={styles.sheetCancelText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

interface RenameSheetProps {
  mochi: MochiSpec | undefined
  currentName: string
  onSave: (name: string) => void
  onResetName: () => void
  onClose: () => void
}

function RenameSheet({
  mochi,
  currentName,
  onSave,
  onResetName,
  onClose,
}: RenameSheetProps) {
  const [draft, setDraft] = useState(currentName)
  if (!mochi) return null
  const defaultLabel = `Mochi the ${mochi.archetype.role}`
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHead}>
              <Text style={styles.sheetGlyph}>{mochi.archetype.glyph}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Rename</Text>
                <Text style={styles.sheetSubtitle}>
                  default · {defaultLabel}
                </Text>
              </View>
            </View>
            <TextInput
              autoFocus
              value={draft}
              onChangeText={setDraft}
              placeholder={defaultLabel}
              placeholderTextColor={colors.textSubtle}
              maxLength={24}
              returnKeyType="done"
              onSubmitEditing={() => onSave(draft)}
              style={styles.renameInput}
            />
            <View style={styles.renameButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.renameSecondary,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={onResetName}
              >
                <Text style={styles.renameSecondaryText}>Reset</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.renamePrimary,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => onSave(draft)}
              >
                <Text style={styles.renamePrimaryText}>Save</Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.sheetCancel,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onClose}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

interface AboutCardProps {
  mochi: MochiSpec | undefined
  displayName: string
  unlocked: boolean
  totalXp: number
  onClose: () => void
}

function AboutCard({
  mochi,
  displayName,
  unlocked,
  totalXp,
  onClose,
}: AboutCardProps) {
  if (!mochi) return null
  const sprite = MOCHI_SPRITES[mochi.index]
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.aboutCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.aboutSpriteWrap}>
            {sprite && (
              <Image source={sprite} resizeMode="contain" style={styles.aboutSprite} />
            )}
          </View>
          <Text style={styles.aboutTitle}>{displayName}</Text>
          <Text style={styles.aboutSubtitle}>#{mochi.index + 1}</Text>
          <Text style={styles.aboutFlavor}>{mochi.archetype.flavor}</Text>
          <View style={styles.aboutStats}>
            <Text style={styles.aboutStat}>
              {unlocked ? '✓ Unlocked' : `Unlocks at ${mochi.unlockXp} XP`}
            </Text>
            {!unlocked && (
              <Text style={styles.aboutStat}>
                {mochi.unlockXp - totalXp} XP to go
              </Text>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.sheetCancel,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onClose}
          >
            <Text style={styles.sheetCancelText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

interface AtlasModalProps {
  visible: boolean
  totalXp: number
  devMode: boolean
  overrides: PlacementOverrides
  visits: ReturnType<typeof useVillageVisits>
  onClose: () => void
  onShow: (index: number) => void
  onHide: (index: number) => void
  onAbout: (index: number) => void
  onInvite: (index: number) => void
  onResetAll: () => void
}

function AtlasModal({
  visible,
  totalXp,
  devMode,
  overrides,
  visits,
  onClose,
  onShow,
  onHide,
  onAbout,
  onInvite,
  onResetAll,
}: AtlasModalProps) {
  const insets = useSafeAreaInsets()
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.atlasShell, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.atlasHeader}>
          <Text style={styles.atlasTitle}>Mochi Atlas</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.atlasClose,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.atlasCloseText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.atlasToolbar}>
          <Pressable
            onPress={onResetAll}
            style={({ pressed }) => [
              styles.atlasResetBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.atlasResetText}>↺ Reset all placements</Text>
          </Pressable>
        </View>
        <FlatList
          data={MOCHI_ROSTER}
          keyExtractor={(m) => m.id}
          extraData={visits.now}
          numColumns={1}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
          renderItem={({ item }) => {
            const unlocked = devMode || totalXp >= item.unlockXp
            const hidden = overrides[item.index]?.hidden === true
            const visiting = visits.visiting.has(item.index)
            const inviteMs = visits.invitationMsRemaining(item.index)
            const sprite = MOCHI_SPRITES[item.index]
            const status = !unlocked
              ? `unlocks at ${item.unlockXp} XP`
              : hidden
                ? 'hidden'
                : inviteMs !== null
                  ? `invited · ${Math.ceil(inviteMs / 60_000)}m left`
                  : visiting
                    ? `visiting · ${formatVisitWindow(item.index)}`
                    : `next visit ${formatTimeOfDay(nextArrival(item.index, new Date(visits.now)))}`
            return (
              <View style={styles.atlasRow}>
                <Pressable
                  style={styles.atlasRowMain}
                  onPress={() => onAbout(item.index)}
                >
                  <View style={styles.atlasThumb}>
                    {sprite && (
                      <Image
                        source={sprite}
                        resizeMode="contain"
                        style={[
                          styles.atlasThumbImg,
                          !unlocked && styles.spriteLocked,
                        ]}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.atlasRowName}>
                      {displayNameFor(item, overrides)}
                    </Text>
                    <Text style={styles.atlasRowSub}>
                      #{item.index + 1} · {status}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.atlasActions}>
                  {unlocked && !hidden && !visiting && (
                    <Pressable
                      onPress={() => onInvite(item.index)}
                      style={({ pressed }) => [
                        styles.atlasInviteBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={styles.atlasInviteText}>+ Invite</Text>
                    </Pressable>
                  )}
                  {unlocked && (
                    <Pressable
                      onPress={() =>
                        hidden ? onShow(item.index) : onHide(item.index)
                      }
                      style={({ pressed }) => [
                        styles.atlasToggleBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={styles.atlasToggleText}>
                        {hidden ? '👁' : '🙈'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )
          }}
        />
      </View>
    </Modal>
  )
}

function formatTimeOfDay(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
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
  atlasButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.cream100,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atlasButtonText: { fontSize: 18 },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  placingBanner: {
    backgroundColor: colors.primary100,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary500,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  placingBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.primary700,
    fontFamily: 'Nunito_700Bold',
  },
  placingButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  placingCancel: {
    backgroundColor: colors.cream200,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placingCancelText: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontFamily: 'Nunito_900Black',
  },
  placingConfirm: {
    backgroundColor: colors.success500,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  placingConfirmText: {
    color: '#fff',
    fontSize: fontSizes.xs,
    fontFamily: 'Nunito_900Black',
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

  spriteWrap: { position: 'absolute' },
  sprite: { width: '100%', height: '100%' },
  spriteLocked: {
    opacity: 0.3,
    tintColor: 'rgba(0,0,0,0.85)',
  },
  spriteMoving: {
    opacity: 0.85,
  },
  spriteDimmed: {
    opacity: 0.4,
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

  // Action sheet
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
    borderTopWidth: 4,
    borderColor: colors.primary500,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.sm,
  },
  sheetGlyph: {
    fontSize: 40,
  },
  sheetTitle: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  sheetSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontFamily: 'Nunito_700Bold',
  },
  sheetAction: {
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.cream100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetActionPressed: {
    backgroundColor: colors.cream200,
  },
  sheetActionText: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontFamily: 'Nunito_700Bold',
  },
  sheetActionDisabled: {
    color: colors.textSubtle,
  },
  sheetCancel: {
    marginTop: space.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontFamily: 'Nunito_700Bold',
  },

  // Rename sheet
  renameInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: fontSizes.md,
    color: colors.text,
    fontFamily: 'Nunito_700Bold',
    backgroundColor: colors.cream100,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
  },
  renameSecondary: {
    flex: 1,
    paddingVertical: space.md,
    backgroundColor: colors.cream100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  renameSecondaryText: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontFamily: 'Nunito_700Bold',
  },
  renamePrimary: {
    flex: 2,
    paddingVertical: space.md,
    backgroundColor: colors.primary500,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  renamePrimaryText: {
    fontSize: fontSizes.md,
    color: '#fff',
    fontFamily: 'Nunito_900Black',
  },

  // About card
  aboutCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    paddingBottom: space.xl,
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 4,
    borderColor: colors.primary500,
  },
  aboutSpriteWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutSprite: { width: '100%', height: '100%' },
  aboutTitle: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  aboutSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontFamily: 'Nunito_700Bold',
  },
  aboutFlavor: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
    marginTop: space.sm,
    marginHorizontal: space.lg,
    lineHeight: fontSizes.md * 1.4,
  },
  aboutStats: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.sm,
  },
  aboutStat: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontFamily: 'Nunito_700Bold',
    backgroundColor: colors.cream100,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },

  // Atlas modal
  atlasShell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  atlasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  atlasTitle: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  atlasClose: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atlasCloseText: { fontSize: 20, color: colors.text },
  atlasToolbar: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  atlasResetBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cream100,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  atlasResetText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontFamily: 'Nunito_700Bold',
  },
  atlasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  atlasRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  atlasThumb: {
    width: 56,
    height: 56,
    backgroundColor: colors.cream100,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atlasThumbImg: { width: 48, height: 48 },
  atlasRowName: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  atlasRowSub: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontFamily: 'Nunito_700Bold',
    marginTop: 2,
  },
  atlasActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  atlasInviteBtn: {
    backgroundColor: colors.primary500,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  atlasInviteText: {
    fontSize: fontSizes.xs,
    color: '#fff',
    fontFamily: 'Nunito_900Black',
  },
  atlasToggleBtn: {
    backgroundColor: colors.cream100,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  atlasToggleText: {
    fontSize: fontSizes.xs,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
})
