import { LANGUAGE_INFO } from '../storage/languages';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Hedgehog } from '../components/Hedgehog';
import type { ReadingLanguage } from '../storage/schema';
import { useTheme } from '../theme';

export function LanguageScreen({ onSelect, loadingLanguage, error }: { onSelect: (language: ReadingLanguage) => void; loadingLanguage: ReadingLanguage | null; error: string }) {
  const theme = useTheme();
  return <ScrollView contentContainerStyle={[s.page, { backgroundColor: theme.bg }]}>
    <View style={s.content}>
      <Hedgehog size={88} color={theme.text} strokeWidth={3} />
      <Text style={[s.brand, { color: theme.text }]}>MochiRead</Text>
      <Text style={[s.title, { color: theme.text }]}>What would you like to read?</Text>
      <Text style={[s.hint, { color: theme.textMuted }]}>Choose your language to get started.</Text>
      {([
        { id: 'ja', name: 'Japanese', script: '日本語', detail: 'Kanji, kana, and romaji · Japanese reading and writing' },
        { id: 'es', name: 'Spanish', script: 'Español', detail: 'English definitions · Spanish audio and flashcards' },
        { id: 'zh', name: 'Chinese', script: '中文', detail: 'Pinyin and tones · Chinese reading and writing' },
      ] as const).map((option) => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`Choose ${option.name}`}
        onPress={() => onSelect(option.id)} disabled={loadingLanguage !== null} accessibilityState={{ disabled: loadingLanguage !== null }}
        style={({ pressed }) => [s.card, { backgroundColor: pressed ? theme.accentBg : theme.surface, borderColor: theme.border }]}>
        <View style={s.row}>
          <Text style={[s.script, { color: theme.accent }]}>{option.script}</Text>
          <Text style={[s.name, { color: theme.text }]}>{option.name}</Text>
          <Text style={[s.arrow, { color: theme.textMuted }]}>→</Text>
        </View>
        <Text style={[s.detail, { color: theme.textMuted }]}>{option.detail}</Text>
      </Pressable>)}
      {loadingLanguage && <Text accessibilityLiveRegion="polite" style={[s.hint, { color: theme.accent }]}>Loading {LANGUAGE_INFO[loadingLanguage].name} dictionary…{`\n`}The first download may take a moment.</Text>}
      {!!error && <Text accessibilityRole="alert" style={[s.hint, { color: theme.destructive }]}>{error}</Text>}
      <Text style={[s.hint, { color: theme.textSubtle }]}>Switch languages anytime from the menu.</Text>
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 480, alignItems: 'center', gap: 14 },
  brand: { fontSize: 30, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  hint: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  card: { width: '100%', padding: 22, borderRadius: 18, borderWidth: 1, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  script: { fontSize: 30, fontWeight: '600' },
  name: { fontSize: 21, fontWeight: '600', flex: 1 },
  arrow: { fontSize: 25 },
  detail: { fontSize: 14, lineHeight: 21 },
});
