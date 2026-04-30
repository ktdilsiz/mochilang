import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { AppHeader } from './src/components/AppHeader';
import { HamburgerMenu } from './src/components/HamburgerMenu';
import { Reader } from './src/components/Reader';
import { ThoughtBubble, type WordRect } from './src/components/ThoughtBubble';
import { ExploreModal } from './src/components/ExploreModal';
import { tokenize, type Token } from './src/lib/cn';
import { configureTTS } from './src/lib/tts';
import { StoreProvider, useStore, SPEECH_RATE_VALUES } from './src/state';
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

export default function App() {
  return (
    <StoreProvider>
      <AppRoot />
    </StoreProvider>
  );
}

function AppRoot() {
  const [text, setText] = useState(SAMPLE);
  const [screen, setScreen] = useState<Screen>('reader');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<{ token: Token; rect: WordRect } | null>(
    null
  );
  const [exploring, setExploring] = useState<string | null>(null);

  const { prefs } = useStore();
  const tokens = useMemo(() => tokenize(text), [text]);

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

  const handleEditorCommit = (next: string) => {
    setText(next);
    setScreen('reader');
  };

  const handleLibraryLoad = (next: string) => {
    setText(next);
    setScreen('reader');
  };

  return (
    <SafeAreaView style={s.root}>
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
            showPinyin={prefs.showPinyin}
            onWordPress={(token, rect) => setSelected({ token, rect })}
          />
        </View>
      )}

      {screen === 'editor' && (
        <EditorScreen
          initialText={text}
          onCancel={goReader}
          onCommit={handleEditorCommit}
        />
      )}

      {screen === 'library' && (
        <LibraryScreen
          currentText={text}
          onBack={goReader}
          onLoad={handleLibraryLoad}
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
      <ExpoStatusBar style="auto" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  flex: { flex: 1 },
});
