import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Screen } from '../screens/types';
import { useTheme } from '../theme';
import { Hedgehog } from './Hedgehog';
import type { ReadingLanguage } from '../state';

type Item = {
  id: Screen;
  label: string;
  hint?: string;
  badge?: string;
};

const ITEMS: Item[] = [
  { id: 'editor', label: 'New text', hint: 'Paste something to read' },
  { id: 'library', label: 'Library', hint: 'Saved & recent texts' },
  { id: 'vocab', label: 'Vocabulary', hint: 'Words you’ve saved' },
  { id: 'flashcards', label: 'Flashcards', hint: 'Swipe-to-review your words' },
  { id: 'stats', label: 'Stats', hint: 'Streak & reading activity' },
  { id: 'backup', label: 'Backup & restore', hint: 'Move your data between devices' },
  { id: 'display', label: 'Display', hint: 'Font size & readings' },
  { id: 'audio', label: 'Audio', hint: 'Voice, rate & auto-play' },
  { id: 'help', label: 'Help' },
  { id: 'about', label: 'About' },
];

type Props = {
  open: boolean;
  language: ReadingLanguage;
  onSwitchLanguage: () => void;
  onClose: () => void;
  onSelect: (screen: Screen) => void;
};

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.84);

export function HamburgerMenu({ open, language, onSwitchLanguage, onClose, onSelect }: Props) {
  const theme = useTheme();
  const [hoveredItem, setHoveredItem] = useState<Screen | 'language' | null>(null);
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setHoveredItem(null);
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
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX: slide }],
              backgroundColor: theme.surface,
            },
          ]}
        >
          <View style={s.brandRow}>
            <Hedgehog size={36} color={theme.text} strokeWidth={3.5} />
            <Text style={[s.brand, { color: theme.text }]}>Mochiread</Text>
          </View>
          <Text style={[s.subBrand, { color: theme.textMuted }]}>
            {language === 'ja' ? 'Japanese · 日本語' : 'Chinese · 中文'}
          </Text>
          <Pressable accessibilityRole="button" onPress={onSwitchLanguage}
            onHoverIn={() => setHoveredItem('language')} onHoverOut={() => setHoveredItem(null)}
            style={({ pressed }) => [s.item, { backgroundColor: pressed ? theme.surfaceAlt : hoveredItem === 'language' ? theme.accentBg : 'transparent' }]}>
            <Text style={{ color: theme.accent, fontWeight: '600' }}>Switch language</Text>
          </Pressable>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <ScrollView contentContainerStyle={s.list}>
            {ITEMS.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => onSelect(item.id)}
                onHoverIn={() => setHoveredItem(item.id)}
                onHoverOut={() => setHoveredItem(null)}
                style={({ pressed }) => [
                  s.item,
                  item.id === 'editor'
                    ? { backgroundColor: pressed ? '#1e40af' : hoveredItem === item.id ? '#1d4ed8' : '#2563eb', marginBottom: 6 }
                    : { backgroundColor: pressed ? theme.surfaceAlt : hoveredItem === item.id ? theme.accentBg : 'transparent' },
                ]}
              >
                <View style={s.itemText}>
                  <Text style={[s.itemLabel, { color: item.id === 'editor' ? '#ffffff' : theme.text }]}>
                    {item.label}
                  </Text>
                  {item.hint && (
                    <Text style={[s.itemHint, { color: item.id === 'editor' ? '#dbeafe' : theme.textMuted }]}>
                      {item.hint}
                    </Text>
                  )}
                </View>
                {item.badge && (
                  <View
                    style={[s.badge, { backgroundColor: theme.savedBg }]}
                  >
                    <Text style={[s.badgeText, { color: theme.saved }]}>
                      {item.badge}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  brand: { fontSize: 24, fontWeight: '800' },
  subBrand: {
    fontSize: 13,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
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
  itemText: { flex: 1 },
  itemLabel: { fontSize: 16, fontWeight: '600' },
  itemHint: { fontSize: 12, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
