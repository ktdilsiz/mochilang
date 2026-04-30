import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Screen } from '../screens/types';

type Item = {
  id: Screen;
  label: string;
  hint?: string;
  badge?: string;
};

const ITEMS: Item[] = [
  { id: 'editor', label: 'New text', hint: 'Paste or type Chinese to read' },
  { id: 'library', label: 'Library', hint: 'Saved & recent texts' },
  { id: 'vocab', label: 'Vocabulary', hint: 'Words you’ve saved' },
  { id: 'flashcards', label: 'Flashcards', hint: 'Swipe-to-review your words' },
  { id: 'display', label: 'Display', hint: 'Font size & pinyin' },
  { id: 'audio', label: 'Audio', hint: 'Voice, rate & auto-play' },
  { id: 'help', label: 'Help' },
  { id: 'about', label: 'About' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (screen: Screen) => void;
};

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.84);

export function HamburgerMenu({ open, onClose, onSelect }: Props) {
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: open ? 0 : -DRAWER_WIDTH,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: open ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open]);

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.root}>
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[s.backdrop, { opacity: fade }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            s.drawer,
            { width: DRAWER_WIDTH, transform: [{ translateX: slide }] },
          ]}
        >
          <Text style={s.brand}>Mochiread</Text>
          <Text style={s.subBrand}>Read Chinese, tap a word.</Text>
          <View style={s.divider} />
          <View style={s.list}>
            {ITEMS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => [s.item, pressed && s.itemPressed]}
              >
                <View style={s.itemText}>
                  <Text style={s.itemLabel}>{item.label}</Text>
                  {item.hint && <Text style={s.itemHint}>{item.hint}</Text>}
                </View>
                {item.badge && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  brand: { fontSize: 24, fontWeight: '800', color: '#111827', paddingHorizontal: 12 },
  subBrand: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  list: { gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemPressed: { backgroundColor: '#f3f4f6' },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 16, color: '#111827', fontWeight: '600' },
  itemHint: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
});
