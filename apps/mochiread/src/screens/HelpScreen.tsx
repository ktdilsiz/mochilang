import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';

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
    body: 'Open Library and tap “Save current” to keep the text you’re reading for later.',
  },
  {
    title: 'Adjust display',
    body: 'Open Display in the menu to change font size or hide pinyin entirely.',
  },
  {
    title: 'New text',
    body: 'Open New text in the menu to paste fresh Chinese text and start reading it.',
  },
];

export function HelpScreen({ onBack }: Props) {
  return (
    <View style={s.root}>
      <AppHeader title="Help" leading="back" onLeadingPress={onBack} />
      <ScrollView contentContainerStyle={s.body}>
        {TIPS.map((tip) => (
          <View key={tip.title} style={s.card}>
            <Text style={s.title}>{tip.title}</Text>
            <Text style={s.copy}>{tip.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  body: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  copy: { fontSize: 14, color: '#374151', marginTop: 4, lineHeight: 20 },
});
