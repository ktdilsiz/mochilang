import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme';
import type { ReadingLanguage } from '../state';

type Props = {
  language: ReadingLanguage;
  onBack: () => void;
};

const tips = (language: ReadingLanguage): { title: string; body: string }[] => [
  {
    title: 'Tap a word',
    body: language === 'ja' ? 'A thought bubble shows kana and romaji readings, English meanings, grammar, alternate readings, and a 🔊 button.' : 'A thought bubble shows pinyin, English meanings, and a 🔊 button.',
  },
  {
    title: 'Save to vocab',
    body: language === 'ja' ? 'Tap ★ to save the dictionary form with your original sentence. Find saved words under Vocabulary.' : 'Tap ★ in the bubble to save a word. Find saved words under Vocabulary.',
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
    body: language === 'ja' ? 'Open Display to change font size, theme, or hide readings. Choose Kana, Romaji (Latin letters), or Both. Both is the default.' : 'Open Display to change font size, theme, pinyin visibility, or tone colors. Explore characters from a word bubble to see their components.',
  },
  {
    title: 'New text',
    body: `Open New text and paste ${language === 'ja' ? 'Japanese' : 'Chinese'} text. Your library, vocabulary, and settings stay within this language. Use Switch language in the menu to change languages.`,
  },
  { title: 'Practice writing', body: language === 'ja' ? 'Tap Practice writing in a word bubble to watch stroke order, trace, or test yourself on kanji and kana. Use the arrows to move through the characters.' : 'Tap Practice writing in a word bubble to watch stroke order, trace, or test yourself. Use the arrows to move through the characters.' },
];

export function HelpScreen({ language, onBack }: Props) {
  const theme = useTheme();
  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Help" leading="back" onLeadingPress={onBack} />
      <ScrollView contentContainerStyle={s.body}>
        {tips(language).map((tip) => (
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
