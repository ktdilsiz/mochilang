import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { buildExploreItem, type ExploreItem } from '../lib/decomp';
import { speak } from '../lib/tts';

type Props = {
  initial: string | null;
  onClose: () => void;
};

export function ExploreModal({ initial, onClose }: Props) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!initial) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [initial]);

  if (!initial) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.overlay, { opacity: fade }]}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.center} pointerEvents="box-none">
        <ExploreContent initial={initial} onClose={onClose} />
      </View>
    </Animated.View>
  );
}

function ExploreContent({
  initial,
  onClose,
}: {
  initial: string;
  onClose: () => void;
}) {
  const [stack, setStack] = useState<ExploreItem[]>(() => [
    buildExploreItem(initial),
  ]);

  const current = stack[stack.length - 1];

  const push = (char: string) => {
    setStack((prev) => [...prev, buildExploreItem(char)]);
  };

  const pop = () => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const trail = useMemo(
    () => stack.map((s) => s.char).join(' › '),
    [stack]
  );

  return (
    <Pressable style={s.sheet} onPress={() => {}}>
      <View style={s.header}>
          <Pressable
            onPress={stack.length > 1 ? pop : onClose}
            hitSlop={8}
            style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
            accessibilityLabel={stack.length > 1 ? 'Back' : 'Close'}
          >
            <Text style={s.iconText}>{stack.length > 1 ? '‹' : '✕'}</Text>
          </Pressable>
          <Text style={s.headerTitle}>Explore</Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
            accessibilityLabel="Close"
          >
            <Text style={s.iconTextMuted}>✕</Text>
          </Pressable>
        </View>

        {stack.length > 1 && (
          <Text style={s.trail} numberOfLines={1}>
            {trail}
          </Text>
        )}

        <ScrollView
          style={s.body}
          contentContainerStyle={s.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.heroRow}>
            <View style={s.hero}>
              <Text style={s.bigPinyin}>{current.pinyin}</Text>
              <Text style={s.bigChar}>{current.char}</Text>
            </View>
            <Pressable
              onPress={() => speak(current.char)}
              style={({ pressed }) => [s.speak, pressed && s.speakPressed]}
              hitSlop={8}
              accessibilityLabel="Play pronunciation"
            >
              <Text style={s.speakText}>🔊</Text>
            </Pressable>
          </View>

          {current.meanings.length > 0 ? (
            <View style={s.meaningCard}>
              {current.meanings.slice(0, 8).map((m, i) => (
                <Text key={i} style={s.meaning}>
                  • {m}
                </Text>
              ))}
              {current.meanings.length > 8 && (
                <Text style={s.more}>
                  +{current.meanings.length - 8} more
                </Text>
              )}
            </View>
          ) : (
            <Text style={s.noMeaning}>No definition available.</Text>
          )}

          <Text style={s.sectionTitle}>
            {[...current.char].length > 1 ? 'Characters' : 'Made of'}
          </Text>
          {current.components.length === 0 ? (
            <Text style={s.noBreakdown}>
              No further breakdown — this character is a primitive in our
              dataset.
            </Text>
          ) : (
            <View style={s.componentGrid}>
              {current.components.map((ch, i) => (
                <ComponentCard
                  key={`${ch}-${i}`}
                  char={ch}
                  onPress={() => push(ch)}
                />
              ))}
            </View>
          )}
        </ScrollView>
    </Pressable>
  );
}

function ComponentCard({
  char,
  onPress,
}: {
  char: string;
  onPress: () => void;
}) {
  const item = useMemo(() => buildExploreItem(char), [char]);
  const summary =
    item.meanings[0] ?? '—';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.compCard, pressed && s.compCardPressed]}
    >
      <Text style={s.compChar}>{char}</Text>
      <Text style={s.compPinyin}>{item.pinyin || '—'}</Text>
      <Text style={s.compMeaning} numberOfLines={2}>
        {summary}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 2,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '92%',
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: '#f3f4f6' },
  iconText: { fontSize: 26, fontWeight: '600', color: '#111827', marginTop: -2 },
  iconTextMuted: { fontSize: 16, color: '#6b7280' },
  trail: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  body: { flexGrow: 0 },
  bodyContent: { padding: 20, gap: 16 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  hero: { flex: 1 },
  bigPinyin: { fontSize: 18, color: '#6b7280' },
  bigChar: {
    fontSize: 88,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -1,
    marginTop: 4,
  },
  speak: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakPressed: { backgroundColor: '#dbeafe' },
  speakText: { fontSize: 22 },
  meaningCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  meaning: { fontSize: 15, color: '#374151', lineHeight: 22 },
  more: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  noMeaning: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noBreakdown: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  componentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compCard: {
    width: 116,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    gap: 4,
  },
  compCardPressed: { backgroundColor: '#f9fafb', borderColor: '#bfdbfe' },
  compChar: { fontSize: 36, fontWeight: '700', color: '#111827' },
  compPinyin: { fontSize: 12, color: '#6b7280' },
  compMeaning: {
    fontSize: 11,
    color: '#4b5563',
    textAlign: 'center',
    minHeight: 28,
  },
});
