import { usePreferences } from './state';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { FontSizeSlider } from '../../components/FontSizeSlider';
import { Pronunciation } from '../../components/Pronunciation';
import { getFontSizes } from './preferences';
import { type PinyinMode, type ReadingLanguage, type ThemeMode } from '../../storage/schema';
import { useTheme } from '../../theme';

type Props = {
  language: ReadingLanguage;
  onBack: () => void;
};

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const PINYIN_OPTIONS: { id: PinyinMode; label: string; hint: string }[] = [
  { id: 'on', label: 'Always show', hint: 'Pinyin appears above every word.' },
  {
    id: 'hint',
    label: 'Tap to reveal',
    hint: 'Each word starts as a colored underline. Tap to reveal its pinyin.',
  },
  { id: 'off', label: 'Hide', hint: 'No pinyin row. Hanzi only.' },
];

export function DisplayScreen({ language, onBack }: Props) {
  const { prefs, setPrefs } = usePreferences();
  const theme = useTheme();
  const sizes = getFontSizes(prefs.fontSize);
  const preview = language === 'ja'
    ? [{ word: '日本語', reading: 'にほんご' }, { word: 'を', reading: 'を' }, { word: '読む', reading: 'よむ' }]
    : [{ word: '你好', reading: 'nǐ hǎo' }, { word: '世界', reading: 'shì jiè' }];

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Display" leading="back" onLeadingPress={onBack} />
      <ScrollView contentContainerStyle={s.body}>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.textMuted }}>Drag to adjust</Text>
            <Text style={{ color: theme.accent, fontWeight: '700' }}>{sizes.text} px</Text>
          </View>
          <FontSizeSlider value={sizes.text} onChange={(fontSize) => setPrefs({ fontSize })} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textMuted }}>Small</Text>
            <Text style={{ color: theme.textMuted }}>Large</Text>
          </View>
          <View style={{ backgroundColor: theme.bg, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Live preview</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
              {preview.map((item) => <View key={item.word} style={{ alignItems: 'center' }}>
                {prefs.pinyinMode !== 'off' && <Pronunciation reading={item.reading} language={language} mode={prefs.japaneseReadingMode} word={item.word}
                  style={{ fontSize: sizes.reading, lineHeight: sizes.reading + 2, color: theme.pinyin, textAlign: 'center' }} />}
                <Text testID="font-size-preview" style={{ color: theme.hanzi, fontSize: sizes.text, lineHeight: Math.round(sizes.text * 1.25) }}>{item.word}</Text>
              </View>)}
            </View>
          </View>
        </Section>

        <Section title={language === 'ja' ? 'Readings' : 'Pinyin'} theme={theme}>
          {language === 'ja' && (
            <>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Reading style</Text>
              <View style={s.chipRow}>
                {(['kana', 'romaji', 'both'] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    accessibilityRole="radio"
                    accessibilityLabel={mode === 'kana' ? 'Kana' : mode === 'romaji' ? 'Romaji' : 'Both'}
                    accessibilityState={{ checked: prefs.japaneseReadingMode === mode }}
                    aria-checked={prefs.japaneseReadingMode === mode}
                    onPress={() => setPrefs({ japaneseReadingMode: mode })}
                    style={[s.chip, { backgroundColor: prefs.japaneseReadingMode === mode ? theme.accent : theme.surfaceAlt }]}
                  >
                    <Text style={[s.chipText, { color: prefs.japaneseReadingMode === mode ? '#fff' : theme.text }]}>{mode === 'kana' ? 'Kana' : mode === 'romaji' ? 'Romaji' : 'Both'}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>Kana: ちいさな · Romaji: chiisana. Both shows the two together.</Text>
              <View style={[s.divider, { backgroundColor: theme.border }]} />
            </>
          )}
          <View style={s.pinyinList}>
            {PINYIN_OPTIONS.map((opt) => {
              const selected = prefs.pinyinMode === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setPrefs({ pinyinMode: opt.id })}
                  style={({ pressed }) => [
                    s.pinyinRow,
                    {
                      borderColor: selected ? theme.accent : theme.border,
                      backgroundColor: selected
                        ? theme.accentBg
                        : 'transparent',
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={s.pinyinText}>
                    <Text style={[s.pinyinLabel, { color: theme.text }]}>
                      {opt.label}
                    </Text>
                    <Text
                      style={[s.pinyinHint, { color: theme.textMuted }]}
                    >
                      {language === 'ja'
                        ? opt.hint
                            .replace(/pinyin/gi, 'reading')
                            .replace(/Hanzi/g, 'Japanese text')
                            .replace('colored underline', 'underline')
                        : opt.hint}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.radio,
                      {
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    {selected && (
                      <View
                        style={[
                          s.radioDot,
                          { backgroundColor: theme.accent },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {language === 'zh' && (
            <>
              <View style={[s.divider, { backgroundColor: theme.border }]} />
              <ToggleRow
                label="Tone colors"
                hint="Color each pinyin syllable (or its underline hint) by its tone."
                value={prefs.showToneColors}
                onChange={(v) => setPrefs({ showToneColors: v })}
                theme={theme}
              />
            </>
          )}
        </Section>
      </ScrollView>
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
  pinyinList: { gap: 8 },
  pinyinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pinyinText: { flex: 1 },
  pinyinLabel: { fontSize: 15, fontWeight: '600' },
  pinyinHint: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
