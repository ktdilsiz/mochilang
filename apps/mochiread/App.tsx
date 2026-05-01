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
import { AppHeader } from './src/components/AppHeader';
import { HamburgerMenu } from './src/components/HamburgerMenu';
import { Reader } from './src/components/Reader';
import { ThoughtBubble, type WordRect } from './src/components/ThoughtBubble';
import { ExploreModal } from './src/components/ExploreModal';
import { tokenize, type Token } from './src/lib/cn';
import { configureTTS } from './src/lib/tts';
import { StoreProvider, useStore, SPEECH_RATE_VALUES } from './src/state';
import { useTheme } from './src/theme';
import { EditorScreen } from './src/screens/EditorScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { VocabularyScreen } from './src/screens/VocabularyScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { DisplayScreen } from './src/screens/DisplayScreen';
import { AudioScreen } from './src/screens/AudioScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { HelpScreen } from './src/screens/HelpScreen';
import type { Screen } from './src/screens/types';

const SAMPLE = '你好，世界！我喜欢吃苹果。今天天气很好。';

const KEY_TEXT = 'mochiread:reading:text';
const KEY_PAGE = 'mochiread:reading:page';

export default function App() {
  return (
    <StoreProvider>
      <AppRoot />
    </StoreProvider>
  );
}

function AppRoot() {
  const [text, setText] = useState(SAMPLE);
  const [readingPage, setReadingPage] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>('reader');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<{ token: Token; rect: WordRect } | null>(
    null
  );
  const [exploring, setExploring] = useState<string | null>(null);

  const { prefs, saveText, library, hydrated: storeHydrated } = useStore();
  const theme = useTheme();
  const tokens = useMemo(() => tokenize(text), [text]);

  // If the persisted text matches a library entry modulo whitespace (meaning
  // we updated a seed's formatting), promote the saved currentText to the
  // refreshed version. Same content, just better line breaks.
  useEffect(() => {
    if (!storeHydrated || !hydrated) return;
    const stripped = text.replace(/\s+/g, '');
    if (!stripped) return;
    for (const entry of library) {
      if (entry.text === text) return;
      if (entry.text.replace(/\s+/g, '') === stripped) {
        setText(entry.text);
        return;
      }
    }
  }, [storeHydrated, hydrated, library, text]);

  useEffect(() => {
    (async () => {
      try {
        const [savedText, savedPage] = await Promise.all([
          AsyncStorage.getItem(KEY_TEXT),
          AsyncStorage.getItem(KEY_PAGE),
        ]);
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
    if (hydrated) AsyncStorage.setItem(KEY_TEXT, text);
  }, [text, hydrated]);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEY_PAGE, String(readingPage));
  }, [readingPage, hydrated]);

  useEffect(() => {
    configureTTS({
      rate: SPEECH_RATE_VALUES[prefs.speechRate],
      voice: prefs.voiceId,
    });
  }, [prefs.speechRate, prefs.voiceId]);

  const goReader = () => setScreen('reader');

  const handleMenuSelect = (target: Screen) => {
    setMenuOpen(false);
    setScreen(target);
  };

  const openText = (next: string) => {
    const trimmed = next.trim();
    if (trimmed && trimmed !== text) {
      saveText(trimmed);
      setText(trimmed);
      setReadingPage(0);
    }
    setScreen('reader');
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
      {screen === 'reader' && (
        <View style={s.flex}>
          <AppHeader
            title="Mochiread"
            leading="menu"
            onLeadingPress={() => setMenuOpen(true)}
          />
          <Reader
            tokens={tokens}
            fontSize={prefs.fontSize}
            pinyinMode={prefs.pinyinMode}
            showToneColors={prefs.showToneColors}
            page={readingPage}
            onPageChange={setReadingPage}
            onWordPress={(token, rect) => setSelected({ token, rect })}
          />
        </View>
      )}

      {screen === 'editor' && (
        <EditorScreen
          initialText=""
          onCancel={goReader}
          onCommit={openText}
        />
      )}

      {screen === 'library' && (
        <LibraryScreen
          currentText={text}
          onBack={goReader}
          onLoad={openText}
        />
      )}

      {screen === 'vocab' && <VocabularyScreen onBack={goReader} />}
      {screen === 'flashcards' && <FlashcardsScreen onBack={goReader} />}
      {screen === 'display' && <DisplayScreen onBack={goReader} />}
      {screen === 'audio' && <AudioScreen onBack={goReader} />}
      {screen === 'about' && <AboutScreen onBack={goReader} />}
      {screen === 'help' && <HelpScreen onBack={goReader} />}

      <HamburgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
      />

      <ThoughtBubble
        word={selected?.token.word ?? null}
        pinyin={selected?.token.pinyin ?? ''}
        rect={selected?.rect ?? null}
        onClose={() => setSelected(null)}
        onExplore={(w) => {
          setSelected(null);
          setExploring(w);
        }}
      />

      <ExploreModal
        initial={exploring}
        onClose={() => setExploring(null)}
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
