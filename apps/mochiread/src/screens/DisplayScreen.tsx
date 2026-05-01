import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useStore, type FontSize, type ThemeMode } from '../state';
import { useTheme } from '../theme';

type Props = {
  onBack: () => void;
};

const SIZE_OPTIONS: { id: FontSize; label: string }[] = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
  { id: 'xl', label: 'XL' },
];

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function DisplayScreen({ onBack }: Props) {
  const { prefs, setPrefs } = useStore();
  const theme = useTheme();

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Display" leading="back" onLeadingPress={onBack} />
      <View style={s.body}>
        <Section title="Theme" theme={theme}>
          <View style={s.chipRow}>
            {THEME_OPTIONS.map((opt) => {
              const selected = prefs.themeMode === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setPrefs({ themeMode: opt.id })}
                  style={({ pressed }) => [
                    s.chip,
                    { backgroundColor: theme.surfaceAlt },
                    selected && { backgroundColor: theme.accent },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      s.chipText,
                      { color: theme.text },
                      selected && { color: '#ffffff' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Font size" theme={theme}>
          <View style={s.chipRow}>
            {SIZE_OPTIONS.map((opt) => {
              const selected = prefs.fontSize === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setPrefs({ fontSize: opt.id })}
                  style={({ pressed }) => [
                    s.chip,
                    { backgroundColor: theme.surfaceAlt },
                    selected && { backgroundColor: theme.accent },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      s.chipText,
                      { color: theme.text },
                      selected && { color: '#ffffff' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Pinyin" theme={theme}>
          <ToggleRow
            label="Show pinyin above words"
            value={prefs.showPinyin}
            onChange={(v) => setPrefs({ showPinyin: v })}
            theme={theme}
          />
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <ToggleRow
            label="Tone colors"
            hint="Color each pinyin syllable by its tone."
            value={prefs.showToneColors}
            onChange={(v) => setPrefs({ showToneColors: v })}
            theme={theme}
          />
        </Section>
      </View>
    </View>
  );
}

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: ReturnType<typeof useTheme>;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      <View
        style={[
          s.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  theme,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={s.toggleText}>
        <Text style={[s.toggleLabel, { color: theme.text }]}>{label}</Text>
        {hint && (
          <Text style={[s.toggleHint, { color: theme.textMuted }]}>
            {hint}
          </Text>
        )}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 20 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  chipText: { fontSize: 15, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  toggleHint: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -14 },
});
