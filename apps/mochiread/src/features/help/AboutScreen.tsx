import { LANGUAGE_INFO } from '../../storage/languages';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { Hedgehog } from '../../components/Hedgehog';
import { useTheme, type Theme } from '../../theme';
import type { ReadingLanguage } from '../../storage/schema';

type Props = {
  language: ReadingLanguage;
  onBack: () => void;
};

const VERSION = '0.1.0';

export function AboutScreen({ language, onBack }: Props) {
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
          <Hedgehog size={108} color={theme.text} strokeWidth={3.5} />
          <Text style={[s.brand, { color: theme.text }]}>Mochiread</Text>
          <Text style={[s.tagline, { color: theme.textMuted }]}>
            Read {LANGUAGE_INFO[language].name}, tap a word.
          </Text>
          <Text style={[s.version, { color: theme.textSubtle }]}>
            Version {VERSION}
          </Text>
        </View>

        {language === 'zh' && <Section title="Dictionary" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>
            English definitions come from the{' '}
            <Text style={[s.bold, { color: theme.text }]}>CC-CEDICT</Text>{' '}
            project, distributed under the Creative Commons
            Attribution-ShareAlike 4.0 International License.
          </Text>
          <Text style={[s.copy, { color: theme.text }]}>
            Source: mdbg.net/chinese/dictionary?page=cc-cedict
          </Text>
        </Section>}

        {language === 'es' && <Section title="Spanish dictionary" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>English definitions and word forms come from English Wiktionary contributors via Kaikki and Wiktextract (CC BY-SA 4.0). Includes inflected forms and dictionary-form links. Coverage and accuracy vary by entry.</Text>
          <Text style={[s.copy, { color: theme.accent }]} onPress={() => { if (typeof window !== 'undefined') window.open('./dictionaries/SPANISH-NOTICE.txt', '_blank', 'noopener'); }}>View source and license</Text>
        </Section>}
        {language === 'ja' && <Section title="Japanese dictionary" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>
            Japanese readings and English definitions use the full English edition
            of JMdict, copyright the Electronic Dictionary Research and Development
            Group (EDRDG), under CC BY-SA 4.0. The data is converted from
            scriptin/jmdict-simplified. Readings use dictionary defaults; names
            and readings that depend on context may differ.
          </Text>
          <Text style={[s.copy, { color: theme.text }]}>
            Source: edrdg.org · github.com/scriptin/jmdict-simplified
          </Text>
        </Section>}

        {language === 'zh' && <Section title="Pinyin & segmentation" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>
            Word splitting and pinyin generation are handled by{' '}
            <Text style={[s.bold, { color: theme.text }]}>pinyin-pro</Text>{' '}
            (MIT).
          </Text>
        </Section>}

        {language === 'ja' && <Section title="Japanese romaji" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>Latin-letter readings use WanaKana (MIT), with pronunciation spellings for particles and greetings. Source: github.com/WaniKani/WanaKana</Text>
        </Section>}

        {language === 'zh' && <Section title="Character decomposition" theme={theme}>
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
        </Section>}

        {language === 'ja' && <Section title="Japanese writing" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>Japanese stroke shapes and order: AnimCJK © 2016–2026 FM&amp;SH, derived from Arphic fonts and Make Me a Hanzi. Converted and grouped for MochiRead. Freely available under the Arphic Public License. No warranty.</Text>
          <Text style={[s.copy, { color: theme.accent }]} onPress={() => { if (typeof window !== 'undefined') window.open('./writing/ja/NOTICE.txt', '_blank', 'noopener'); }}>View source and license</Text>
        </Section>}

        <Section title="Speech" theme={theme}>
          <Text style={[s.copy, { color: theme.text }]}>
            Reading uses your browser or device's {LANGUAGE_INFO[language].name} voices.
            Online voices may send text to the browser's speech provider.
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
