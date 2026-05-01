import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useTheme, type Theme } from '../theme';

type Props = {
  onBack: () => void;
};

const VERSION = '0.1.0';

export function AboutScreen({ onBack }: Props) {
  const theme = useTheme();
  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="About" leading="back" onLeadingPress={onBack} />
      <ScrollView contentContainerStyle={s.body}>
        <View
          style={[
            s.heroCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[s.brand, { color: theme.text }]}>Mochiread</Text>
          <Text style={[s.tagline, { color: theme.textMuted }]}>
            Read Chinese, tap a word.
          </Text>
          <Text style={[s.version, { color: theme.textSubtle }]}>
            Version {VERSION}
          </Text>
        </View>

        <Section title="Dictionary" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>
            English definitions come from the{' '}
            <Text style={[s.bold, { color: theme.text }]}>CC-CEDICT</Text>{' '}
            project, distributed under the Creative Commons
            Attribution-ShareAlike 4.0 International License.
          </Text>
          <Text style={[s.copy, { color: theme.text }]}>
            Source: mdbg.net/chinese/dictionary?page=cc-cedict
          </Text>
        </Section>

        <Section title="Pinyin & segmentation" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>
            Word splitting and pinyin generation are handled by{' '}
            <Text style={[s.bold, { color: theme.text }]}>pinyin-pro</Text>{' '}
            (MIT).
          </Text>
        </Section>

        <Section title="Character decomposition" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>
            The Explore view uses data from{' '}
            <Text style={[s.bold, { color: theme.text }]}>
              Make Me a Hanzi
            </Text>
            , distributed under the LGPL and the Arphic Public License.
          </Text>
          <Text style={[s.copy, { color: theme.text }]}>
            Source: github.com/skishore/makemeahanzi
          </Text>
        </Section>

        <Section title="Speech" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>
            Spoken Chinese uses your device's built-in Mandarin voice via the
            system text-to-speech engine. No audio is sent to any server.
          </Text>
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
  theme: Theme;
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

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 16, paddingBottom: 32 },
  heroCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 4,
  },
  brand: { fontSize: 28, fontWeight: '800' },
  tagline: { fontSize: 14 },
  version: { fontSize: 12, marginTop: 6 },
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
    gap: 8,
  },
  copy: { fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '700' },
});
