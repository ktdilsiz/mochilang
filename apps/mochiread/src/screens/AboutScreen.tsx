import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';

type Props = {
  onBack: () => void;
};

const VERSION = '0.1.0';

export function AboutScreen({ onBack }: Props) {
  return (
    <View style={s.root}>
      <AppHeader title="About" leading="back" onLeadingPress={onBack} />
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.heroCard}>
          <Text style={s.brand}>Mochiread</Text>
          <Text style={s.tagline}>Read Chinese, tap a word.</Text>
          <Text style={s.version}>Version {VERSION}</Text>
        </View>

        <Section title="Dictionary">
          <Text style={s.copy}>
            English definitions come from the{' '}
            <Text style={s.bold}>CC-CEDICT</Text> project, distributed under the
            Creative Commons Attribution-ShareAlike 4.0 International License.
          </Text>
          <Text style={s.copy}>
            Source: mdbg.net/chinese/dictionary?page=cc-cedict
          </Text>
        </Section>

        <Section title="Pinyin & segmentation">
          <Text style={s.copy}>
            Word splitting and pinyin generation are handled by{' '}
            <Text style={s.bold}>pinyin-pro</Text> (MIT).
          </Text>
        </Section>

        <Section title="Character decomposition">
          <Text style={s.copy}>
            The Explore view uses data from{' '}
            <Text style={s.bold}>Make Me a Hanzi</Text>, distributed under the
            LGPL and the Arphic Public License.
          </Text>
          <Text style={s.copy}>
            Source: github.com/skishore/makemeahanzi
          </Text>
        </Section>

        <Section title="Speech">
          <Text style={s.copy}>
            Spoken Chinese uses your device’s built-in Mandarin voice via the
            system text-to-speech engine. No audio is sent to any server.
          </Text>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  body: { padding: 16, gap: 16, paddingBottom: 32 },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    gap: 4,
  },
  brand: { fontSize: 28, fontWeight: '800', color: '#111827' },
  tagline: { fontSize: 14, color: '#6b7280' },
  version: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
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
    gap: 8,
  },
  copy: { fontSize: 14, color: '#374151', lineHeight: 20 },
  bold: { fontWeight: '700', color: '#111827' },
});
