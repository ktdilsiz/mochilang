import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme';

type Props = {
  onBack: () => void;
};

const TIPS: { title: string; body: string }[] = [
  {
    title: 'Tap a word',
    body: 'A thought bubble pops up with pinyin, English meanings, and a 🔊 button to hear it.',
  },
  {
    title: 'Save to vocab',
    body: 'In the bubble, tap ★ to save a word. Find it later under Vocabulary in the menu.',
  },
  {
    title: 'Save the text',
    body: 'Anything you open from “New text” is added to Library automatically.',
  },
  {
    title: 'Adjust display',
    body: 'Open Display in the menu to change font size, theme, or hide pinyin.',
  },
  {
    title: 'New text',
    body: 'Open New text in the menu to paste fresh Chinese text and start reading it.',
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
