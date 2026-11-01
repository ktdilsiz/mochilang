import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppHeader } from './src/components/AppHeader';
import { HamburgerMenu } from './src/components/HamburgerMenu';
import { Reader } from './src/components/Reader';
import { ThoughtBubble, type WordRect } from './src/components/ThoughtBubble';
import { ExploreModal } from './src/components/ExploreModal';
import { StrokePracticeModal } from './src/components/StrokePracticeModal';
import { TranslationSheet } from './src/components/TranslationSheet';
import {
  tokenize,
  type Token,
} from '@mochilang/dict';
import { configureTTS, stop as stopSpeech } from './src/lib/tts';
import { sentenceForToken } from './src/lib/reading';
import {
  StoreProvider,
  useStore,
  SPEECH_RATE_VALUES,
  type ReadingLanguage,
} from './src/state';
import { useTheme } from './src/theme';
import { EditorScreen } from './src/screens/EditorScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { VocabularyScreen } from './src/screens/VocabularyScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { DisplayScreen } from './src/screens/DisplayScreen';
import { AudioScreen } from './src/screens/AudioScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { HelpScreen } from './src/screens/HelpScreen';
import { LanguageScreen } from './src/screens/LanguageScreen';
import type { Screen } from './src/screens/types';

const SAMPLE = '你好，世界！我喜欢吃苹果。今天天气很好。';

const KEY_TEXT = 'mochiread:reading:text';
const KEY_PAGE = 'mochiread:reading:page';
const KEY_LANGUAGE = 'mochiread:reading:language';

export default function App() {
  const [language, setLanguage] = useState<ReadingLanguage | null>(null);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider key={language ?? 'choose'} language={language ?? 'zh'}>
        <AppRoot initialLanguage={language} onSelectLanguage={setLanguage} />
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

function AppRoot({ initialLanguage, onSelectLanguage }: { initialLanguage: ReadingLanguage | null; onSelectLanguage: (language: ReadingLanguage | null) => void }) {
  const language = initialLanguage ?? 'zh';
  const [text, setText] = useState(language === 'ja' ? 'こんにちは、世界！今日はいい天気です。日本語を読んでみましょう。' : SAMPLE);
  const [readingPage, setReadingPage] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>('reader');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<{ token: Token; rect: WordRect; sentence: string } | null>(
    null
  );
  const [exploring, setExploring] = useState<string | null>(null);
  const [practicing, setPracticing] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);

  const {
    prefs,
    saveText,
    library,
    hydrated: storeHydrated,
    recordWordTap,
    recordReadingTime,
  } = useStore();
  const theme = useTheme();
  const tokens = useMemo(() => tokenize(text, language), [text, language]);

  // If the persisted text matches a library entry modulo whitespace (meaning
  // we updated a seed's formatting), promote the saved currentText to the
  // refreshed version. Same content, just better line breaks.
  useEffect(() => {
    if (!storeHydrated || !hydrated) return;
    const stripped = text.replace(/\s+/g, '');
    if (!stripped) return;
    for (const entry of library) {
      if (entry.text === text && entry.language === language) return;
      if (entry.language !== language) continue;
      if (entry.text.replace(/\s+/g, '') === stripped) {
        setText(entry.text);
        return;
      }
    }
  }, [storeHydrated, hydrated, library, text, language]);

  useEffect(() => {
    (async () => {
      try {
        const [currentText, currentPage, savedLanguage, legacyText, legacyPage] = await Promise.all([
          AsyncStorage.getItem(`${KEY_TEXT}:${language}`),
          AsyncStorage.getItem(`${KEY_PAGE}:${language}`),
          AsyncStorage.getItem(KEY_LANGUAGE),
          AsyncStorage.getItem(KEY_TEXT),
          AsyncStorage.getItem(KEY_PAGE),
        ]);
        const matchesLegacy = (savedLanguage === 'ja' ? 'ja' : 'zh') === language;
        const savedText = currentText ?? (matchesLegacy ? legacyText : null);
        const savedPage = currentPage ?? (matchesLegacy ? legacyPage : null);
        if (savedText) setText(savedText);
        if (savedPage) {
          const n = parseInt(savedPage, 10);
          if (Number.isFinite(n) && n >= 0) setReadingPage(n);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (hydrated && initialLanguage) AsyncStorage.setItem(`${KEY_TEXT}:${language}`, text);
  }, [text, hydrated]);

  useEffect(() => {
    if (hydrated && initialLanguage) AsyncStorage.setItem(`${KEY_PAGE}:${language}`, String(readingPage));
  }, [readingPage, hydrated]);

  useEffect(() => {
    configureTTS({
      rate: SPEECH_RATE_VALUES[prefs.speechRate],
      voice: prefs.voiceId,
      japaneseVoice: prefs.japaneseVoiceId,
    });
  }, [prefs.speechRate, prefs.voiceId, prefs.japaneseVoiceId]);

  // Track time on the reader screen in 30s ticks. Foreground-only because JS
  // intervals are paused when the app goes to background.
  useEffect(() => {
    if (!initialLanguage || !hydrated || !storeHydrated || screen !== 'reader') return;
    const interval = setInterval(() => recordReadingTime(30), 30_000);
    return () => clearInterval(interval);
  }, [screen, recordReadingTime, initialLanguage, hydrated, storeHydrated]);

  useEffect(() => () => stopSpeech(), []);

  const goReader = () => setScreen('reader');

  const handleMenuSelect = (target: Screen) => {
    setMenuOpen(false);
    setScreen(target);
  };

  const openText = (next: string, nextLanguage: ReadingLanguage) => {
    if (nextLanguage !== language) return;
    const trimmed = next.trim();
    if (trimmed && (trimmed !== text || nextLanguage !== language)) {
      stopSpeech();
      setSelected(null);
      setExploring(null);
      setPracticing(null);
      setTranslating(null);
      saveText(trimmed, nextLanguage);
      setText(trimmed);
      setReadingPage(0);
    }
    setScreen('reader');
  };

  if (!initialLanguage) return <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}><LanguageScreen onSelect={onSelectLanguage} /></SafeAreaView>;
  if (!hydrated || !storeHydrated) return <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]} />;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
      {screen === 'reader' && (
        <View style={s.flex}>
          <AppHeader
            title={`MochiRead · ${language === 'ja' ? 'Japanese' : 'Chinese'}`}
            leading="menu"
            onLeadingPress={() => setMenuOpen(true)}
          />
          <Reader
            tokens={tokens}
            language={language}
            fontSize={prefs.fontSize}
            pinyinMode={prefs.pinyinMode}
            japaneseReadingMode={prefs.japaneseReadingMode}
            showToneColors={prefs.showToneColors}
            pagePlayback={prefs.pagePlayback}
            page={readingPage}
            onPageChange={setReadingPage}
            onWordPress={(token, rect) => {
              setSelected({ token, rect, sentence: sentenceForToken(tokens, tokens.indexOf(token)) });
              recordWordTap();
            }}
            onTranslate={(text) => setTranslating(text)}
          />
        </View>
      )}

      {screen === 'editor' && (
        <EditorScreen
          initialText=""
          initialLanguage={language}
          onCancel={goReader}
          onCommit={openText}
        />
      )}

      {screen === 'library' && (
        <LibraryScreen
          currentText={text}
          currentLanguage={language}
          onBack={goReader}
          onLoad={openText}
        />
      )}

      {screen === 'vocab' && <VocabularyScreen onBack={goReader} />}
      {screen === 'flashcards' && <FlashcardsScreen onBack={goReader} />}
      {screen === 'stats' && <StatsScreen onBack={goReader} />}
      {screen === 'display' && (
        <DisplayScreen language={language} onBack={goReader} />
      )}
      {screen === 'audio' && <AudioScreen language={language} onBack={goReader} />}
      {screen === 'about' && <AboutScreen language={language} onBack={goReader} />}
      {screen === 'help' && <HelpScreen language={language} onBack={goReader} />}

      <HamburgerMenu
        open={menuOpen}
        language={language}
        onSwitchLanguage={() => { stopSpeech(); onSelectLanguage(null); }}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
      />

      <ThoughtBubble
        word={selected?.token.word ?? null}
        language={language}
        pinyin={selected?.token.pinyin ?? ''}
        japanese={selected?.token.japanese}
        sentence={selected?.sentence}
        rect={selected?.rect ?? null}
        onClose={() => setSelected(null)}
        onExplore={(w) => {
          setSelected(null);
          setExploring(w);
        }}
        onPractice={(c) => {
          setSelected(null);
          setPracticing(c);
        }}
      />

      <ExploreModal
        initial={exploring}
        onClose={() => setExploring(null)}
      />

      <StrokePracticeModal
        word={practicing}
        language={language}
        onClose={() => setPracticing(null)}
      />

      <TranslationSheet
        text={translating}
        language={language}
        onClose={() => setTranslating(null)}
      />
      <ExpoStatusBar style={theme.isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  flex: { flex: 1 },
});
