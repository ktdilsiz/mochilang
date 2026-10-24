import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme';

type Props = {
  onBack: () => void;
};

const TIPS: { title: string; body: string }[] = [
  {
    title: 'Tap a word',
    body: 'A thought bubble shows pinyin or Japanese readings, English meanings, and a 🔊 button. Japanese entries show grammar, the dictionary form of conjugated words, and alternate readings separately.',
  },
  {
    title: 'Save to vocab',
    body: 'In the bubble, tap ★ to save a word. Japanese cards save the dictionary form with your original sentence. Find them under Vocabulary in the menu.',
  },
  {
    title: 'Translate a passage',
    body: 'Long-press a word to enter selection mode, then tap another word to extend the range. Hit Translate to get an English translation.',
  },
  {
    title: 'Save the text',
    body: 'Anything you open from “New text” is added to Library automatically.',
  },
  {
    title: 'Adjust display',
    body: 'Open Display to change font size, theme, or hide readings. Japanese offers Kana, Romaji (Latin letters), or Both. Both is the default; choose Always show to keep readings visible. Character exploration and writing practice are available for Chinese.',
  },
  {
    title: 'New text',
    body: 'Open New text, choose Chinese or Japanese, then paste your text. Each library entry remembers its language.',
  },
];

export function HelpScreen({ onBack }: Props) {
  const theme = useTheme();
  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Help" leading="back" onLeadingPress={onBack} />
      <ScrollView contentContainerStyle={s.body}>
        {TIPS.map((tip) => (
          <View
            key={tip.title}
            style={[
              s.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[s.title, { color: theme.text }]}>{tip.title}</Text>
            <Text style={[s.copy, { color: theme.text }]}>{tip.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 10 },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 15, fontWeight: '700' },
  copy: { fontSize: 14, marginTop: 4, lineHeight: 20 },
});
