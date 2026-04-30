import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useStore, type FontSize } from '../state';

type Props = {
  onBack: () => void;
};

const SIZE_OPTIONS: { id: FontSize; label: string }[] = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
  { id: 'xl', label: 'XL' },
];

export function DisplayScreen({ onBack }: Props) {
  const { prefs, setPrefs } = useStore();

  return (
    <View style={s.root}>
      <AppHeader title="Display" leading="back" onLeadingPress={onBack} />
      <View style={s.body}>
        <Section title="Font size">
          <View style={s.chipRow}>
            {SIZE_OPTIONS.map((opt) => {
              const selected = prefs.fontSize === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setPrefs({ fontSize: opt.id })}
                  style={({ pressed }) => [
                    s.chip,
                    selected && s.chipSelected,
                    pressed && s.chipPressed,
                  ]}
                >
                  <Text
                    style={[s.chipText, selected && s.chipTextSelected]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Pinyin">
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Show pinyin above words</Text>
            <Switch
              value={prefs.showPinyin}
              onValueChange={(v) => setPrefs({ showPinyin: v })}
            />
          </View>
        </Section>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  body: { padding: 16, gap: 20 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  chipPressed: { opacity: 0.85 },
  chipSelected: { backgroundColor: '#3b82f6' },
  chipText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  chipTextSelected: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 15, color: '#111827' },
});
