import { usePreferences } from '../features/settings/state';
import { useLibrary } from '../features/library/state';
import { useActivity } from '../features/activity/state';
import { useHydration } from './StoreProvider';
import { usePersistentState } from '../storage/usePersistentState';
import { prepareDictionary } from '../platform/dictionaries';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getPreferredLanguage, setPreferredLanguage, readReadingSession, writeReadingText, writeReadingPage } from '../storage/repository';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppHeader } from '../components/AppHeader';
import { HamburgerMenu } from '../components/HamburgerMenu';
import { Reader } from '../features/reading/Reader';
import { ThoughtBubble, type WordRect } from '../features/reading/ThoughtBubble';
import { ExploreModal } from '../features/writing/ExploreModal';
import { StrokePracticeModal } from '../features/writing/StrokePracticeModal';
import { TranslationSheet } from '../features/reading/TranslationSheet';
import {
  tokenize,
  type Token,
} from '@mochilang/dict/core';
import { configureTTS, stop as stopSpeech } from '../platform/speech/tts';
import { sentenceForToken } from '../features/reading/reading';
import { StoreProvider } from './StoreProvider';
import { SPEECH_RATE_VALUES } from '../features/settings/preferences';
import { type ReadingLanguage } from '../storage/schema';
import { useTheme } from '../theme';
import { EditorScreen } from '../features/reading/EditorScreen';
import { LibraryScreen } from '../features/library/LibraryScreen';
import { VocabularyScreen } from '../features/vocabulary/VocabularyScreen';
import { FlashcardsScreen } from '../features/vocabulary/FlashcardsScreen';
import { StatsScreen } from '../features/activity/StatsScreen';
import { DisplayScreen } from '../features/settings/DisplayScreen';
import { AudioScreen } from '../features/settings/AudioScreen';
import { AboutScreen } from '../features/help/AboutScreen';
import { HelpScreen } from '../features/help/HelpScreen';
import { LanguageScreen } from './LanguageScreen';
import { BackupScreen } from '../features/backup/BackupScreen';
import { recoverInterruptedRestore } from '../storage/backup';
import type { Screen } from './navigation';

const SAMPLE = '你好，世界！我喜欢吃苹果。今天天气很好。';


export default function App() {
  const [language, setLanguage] = useState<ReadingLanguage | null>(null);
  const [restoringLanguage, setRestoringLanguage] = useState(true);
  const [loadingLanguage, setLoadingLanguage] = useState<ReadingLanguage | null>(null);
  const [loadError, setLoadError] = useState('');
  const [restoreVersion, setRestoreVersion] = useState(0);
  const selectLanguage = async (next: ReadingLanguage | null) => {
    if (!next) { setLanguage(null); return; }
    if (loadingLanguage) return;
    setLoadError('');
    setLoadingLanguage(next);
    try {
      await recoverInterruptedRestore();
      await prepareDictionary(next);
      setLanguage(next);
      // A failed preference write must not block opening the reader.
      setPreferredLanguage(next).catch(() => {});
    } catch {
      setLoadError('Couldn’t download the reading dictionary. Check your connection and choose the language again to retry.');
    } finally { setLoadingLanguage(null); }
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await getPreferredLanguage();
        if (!active) return;
        setRestoringLanguage(false);
        if (saved === 'ja' || saved === 'zh') {
          await selectLanguage(saved);
        }
      } catch {
        // If storage is unavailable, show the normal language picker.
        if (active) setRestoringLanguage(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider key={`${language ?? 'choose'}:${restoreVersion}`} language={language ?? 'zh'} enabled={language !== null}>
        {restoringLanguage ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Opening MochiRead…</Text></View> : <AppRoot initialLanguage={language} onSelectLanguage={selectLanguage} loadingLanguage={loadingLanguage} loadError={loadError} onRestored={() => setRestoreVersion((value) => value + 1)} />}
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

function AppRoot({ initialLanguage, onSelectLanguage, loadingLanguage, loadError, onRestored }: { initialLanguage: ReadingLanguage | null; onSelectLanguage: (language: ReadingLanguage | null) => void; loadingLanguage: ReadingLanguage | null; loadError: string; onRestored: () => void }) {
  const language = initialLanguage ?? 'zh';
  const initialText = language === 'ja' ? 'こんにちは、世界！今日はいい天気です。日本語を読んでみましょう。' : SAMPLE;
  const loadSession = useCallback(async () => {
    const saved = await readReadingSession(language);
    return { text: saved.text || initialText, page: saved.page ?? 0 };
  }, [language, initialText]);
  const saveSession = useCallback(async (value: { text: string; page: number }) => {
    await writeReadingText(language, value.text);
    await writeReadingPage(language, value.page);
  }, [language]);
  const { value: session, setValue: setSession, hydrated, error: sessionError, saveError: sessionSaveError, retrySave: retrySessionSave } = usePersistentState({ text: initialText, page: 0 }, loadSession, saveSession, initialLanguage !== null);
  const { text, page: readingPage } = session;
  const setText = useCallback((text: string) => setSession((previous) => ({ ...previous, text })), [setSession]);
  const setReadingPage = useCallback((page: number) => setSession((previous) => ({ ...previous, page })), [setSession]);
  const [screen, setScreen] = useState<Screen>('reader');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<{ token: Token; rect: WordRect; sentence: string } | null>(
    null
  );
  const [exploring, setExploring] = useState<string | null>(null);
  const [practicing, setPracticing] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);

  const { prefs } = usePreferences();
  const { saveText, library } = useLibrary();
  const { hydrated: storeHydrated, error: storageError, saveError: storeSaveError, retrySave: retryStoreSave } = useHydration();
  const { recordWordTap, recordReadingTime } = useActivity();
  const theme = useTheme();
  const tokens = useMemo(() => initialLanguage ? tokenize(text, language) : [], [text, language, initialLanguage]);

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
  }, [storeHydrated, hydrated, library, text, language, setText]);

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

  if (!initialLanguage) return <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}><LanguageScreen onSelect={onSelectLanguage} loadingLanguage={loadingLanguage} error={loadError} /></SafeAreaView>;
  if (storageError || sessionError) return <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
    {screen === 'backup' ? <BackupScreen onBack={goReader} onRestored={onRestored} /> : <View style={{ padding: 24, gap: 16 }}>
      <Text accessibilityRole="alert" style={{ color: theme.text }}>Couldn’t load saved data. You can retry or restore a backup.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry loading" onPress={onRestored}><Text style={{ color: theme.accent }}>Retry loading</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Backup & restore" onPress={() => setScreen('backup')}><Text style={{ color: theme.accent }}>Backup & restore</Text></Pressable>
    </View>}
  </SafeAreaView>;
  if (!hydrated || !storeHydrated) return <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]} />;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
      {(storeSaveError || sessionSaveError) && <View style={{ padding: 12, gap: 8, backgroundColor: theme.surface }}>
        <Text accessibilityRole="alert" style={{ color: theme.destructive }}>Changes couldn’t be saved on this device. Keep MochiRead open and retry saving before leaving or reloading.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry saving" onPress={() => { retryStoreSave(); retrySessionSave(); }}><Text style={{ color: theme.accent }}>Retry saving</Text></Pressable>
      </View>}
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
      {screen === 'backup' && <BackupScreen onBack={goReader} onRestored={() => { stopSpeech(); onRestored(); }} />}
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
