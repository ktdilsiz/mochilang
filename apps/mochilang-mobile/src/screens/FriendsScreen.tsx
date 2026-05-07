import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { api, ApiError, type FriendResponse } from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

/**
 * RN port of the web FriendsScreen. Mirrors the web flow:
 * list of friends sorted by this week's XP, tap a row to open a
 * modal with stats + a 7-day bar chart. No bundled-JSON fallback
 * yet — offline state shows an empty message (Phase 2 mobile).
 */
export default function FriendsScreen() {
  const [friends, setFriends] = useState<FriendResponse[]>([])
  const [daysIntoWeek, setDaysIntoWeek] = useState(0)
  const [offline, setOffline] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<FriendResponse | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await api.listFriends(ctrl.signal)
        setFriends(r.friends)
        setDaysIntoWeek(r.daysIntoWeek)
        setOffline(false)
      } catch (err) {
        if (err instanceof ApiError) {
          // 4xx/5xx from the server — leave list empty.
          return
        }
        // Network error — flag offline. No bundled JSON for Phase 2 mobile.
        setOffline(true)
      } finally {
        setLoaded(true)
      }
    })()
    return () => ctrl.abort()
  }, [])

  const ranked = useMemo(
    () => [...friends].sort((a, b) => b.thisWeek - a.thisWeek),
    [friends]
  )

  return (
    <ScrollView contentContainerStyle={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.sub}>
          {friends.length} friends · this week's leaders shown first
          {offline ? ' · offline' : ''}
        </Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <LedgeButton tone="neutral" label="🔗 Add by username" />
        </View>
        <View style={styles.actionItem}>
          <LedgeButton tone="neutral" label="📇 Sync contacts" />
        </View>
      </View>

      {loaded && offline && friends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Friends are offline — connect to see who's on a streak.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {ranked.map((friend) => (
            <Pressable
              key={friend.id}
              onPress={() => setSelected(friend)}
              style={({ pressed }) => [
                styles.row,
                pressed && { borderColor: colors.primary300 },
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{friend.avatar}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameLine}>
                  <Text style={styles.name} numberOfLines={1}>
                    {friend.name}
                  </Text>
                  <Text style={styles.flag}>{friend.flag}</Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.streak}>🔥 {friend.streak}</Text>
                  <Text style={styles.totalXp}>
                    ⚡ {friend.totalXp.toLocaleString()}
                  </Text>
                </View>
              </View>
              <View style={styles.week}>
                <Text style={styles.weekXp}>
                  {friend.thisWeek.toLocaleString()}
                </Text>
                <Text style={styles.weekLabel}>this week</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <FriendModal
        friend={selected}
        daysIntoWeek={daysIntoWeek}
        onClose={() => setSelected(null)}
      />
    </ScrollView>
  )
}

interface FriendModalProps {
  friend: FriendResponse | null
  daysIntoWeek: number
  onClose: () => void
}

function FriendModal({ friend, daysIntoWeek, onClose }: FriendModalProps) {
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const max = Math.max(1, ...(friend?.daily ?? [1]))

  return (
    <Modal
      transparent
      animationType="fade"
      visible={friend !== null}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner Pressable swallows taps so they don't dismiss. */}
        <Pressable style={styles.modalCard} onPress={() => {}}>
          {friend && (
            <>
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>

              <View style={styles.modalHead}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarEmoji}>{friend.avatar}</Text>
                </View>
                <View style={styles.modalHeadInfo}>
                  <View style={styles.nameLine}>
                    <Text style={styles.modalName} numberOfLines={1}>
                      {friend.name}
                    </Text>
                    <Text style={styles.flag}>{friend.flag}</Text>
                  </View>
                  <Text style={styles.modalHandle}>{friend.handle}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <Stat label="Streak" value={`🔥 ${friend.streak}`} />
                <Stat
                  label="Total XP"
                  value={friend.totalXp.toLocaleString()}
                />
                <Stat
                  label="Studying"
                  value={friend.languages
                    .map((l) => l.toUpperCase())
                    .join(' · ')}
                />
              </View>

              <View style={styles.barsBlock}>
                <Text style={styles.barsHeader}>This week</Text>
                <View style={styles.barsGrid}>
                  {days.map((label, d) => {
                    const isFuture = d > daysIntoWeek
                    const xp = friend.daily[d] ?? 0
                    const h = isFuture ? 8 : Math.max(8, (xp / max) * 80)
                    return (
                      <View key={label} style={styles.barCol}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { height: h },
                              isFuture && styles.barFillFuture,
                            ]}
                          />
                        </View>
                        <Text style={styles.barLabel}>{label}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>

              <View style={styles.cta}>
                <LedgeButton
                  tone="primary"
                  size="lg"
                  label="Send a nudge"
                  onPress={() => {}}
                />
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    padding: space.lg,
    paddingBottom: space.xxl * 3,
    gap: space.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: space.xs,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    color: colors.text,
  },
  sub: {
    marginTop: space.xs,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  actionItem: { flex: 1 },
  list: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  info: {
    flex: 1,
    gap: 2,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontWeight: '800',
    fontSize: fontSizes.md,
    color: colors.text,
    flexShrink: 1,
  },
  flag: {
    fontSize: 14,
    opacity: 0.85,
  },
  meta: {
    flexDirection: 'row',
    gap: space.sm,
  },
  streak: {
    fontSize: fontSizes.sm,
    color: colors.primary700,
    fontWeight: '700',
  },
  totalXp: {
    fontSize: fontSizes.sm,
    color: colors.xp700,
    fontWeight: '700',
  },
  week: {
    alignItems: 'flex-end',
    gap: 1,
  },
  weekXp: {
    fontWeight: '900',
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  weekLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  empty: {
    padding: space.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: fontSizes.sm,
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(58, 37, 22, 0.4)',
    justifyContent: 'flex-end',
    padding: space.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    paddingBottom: space.lg,
    marginBottom: space.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: space.xs,
    right: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    zIndex: 1,
  },
  closeBtnText: {
    fontSize: 28,
    color: colors.textMuted,
    lineHeight: 30,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.md,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarEmoji: { fontSize: 44 },
  modalHeadInfo: {
    flex: 1,
    gap: 2,
  },
  modalName: {
    fontSize: fontSizes.xl,
    fontWeight: '900',
    color: colors.text,
    flexShrink: 1,
  },
  modalHandle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.lg,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: space.sm,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '900',
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textSubtle,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  barsBlock: {
    marginBottom: space.sm,
  },
  barsHeader: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: space.sm,
  },
  barsGrid: {
    flexDirection: 'row',
    height: 100,
    gap: 6,
    alignItems: 'flex-end',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.success500,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    minHeight: 4,
  },
  // RN can't do CSS dashed gradients, so future days get a muted hatched
  // look via a flat surfaceAlt fill with a dashed top border.
  barFillFuture: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  cta: {
    marginTop: space.md,
  },
})
