import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { translate } from '@mochilang/translate';
import { speak } from '../lib/tts';
import type { ReadingLanguage } from '../state';
import { useTheme, type Theme } from '../theme';

type Props = {
  text: string | null;
  language: ReadingLanguage;
  onClose: () => void;
};

export function TranslationSheet({ text, language, onClose }: Props) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!text) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [text]);

  if (!text) return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.overlay, { opacity: fade }]}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.center} pointerEvents="box-none">
        <Sheet key={`${language}:${text}`} text={text} language={language} onClose={onClose} />
      </View>
    </Animated.View>
  );
}

function Sheet({
  text,
  language,
  onClose,
}: {
  text: string;
  language: ReadingLanguage;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ok'; translation: string; source: string }
    | { kind: 'error'; message: string }
  >({ kind: 'loading' });

  const [retry, setRetry] = useState(0);
  const fetchTranslation = () => setRetry((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    translate(text, { from: language, to: 'en', signal: controller.signal })
      .then(({ translation, source }) => {
        if (!controller.signal.aborted) setState({ kind: 'ok', translation, source });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, [text, language, retry]);

  return (
    <Pressable
      style={[s.sheet, { backgroundColor: theme.surface }]}
      onPress={() => {}}
    >
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <Text style={[s.title, { color: theme.text }]}>Translation</Text>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={({ pressed }) => [
            s.closeBtn,
            pressed && { backgroundColor: theme.surfaceAlt },
          ]}
          accessibilityLabel="Close"
        >
          <Text style={[s.closeIcon, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionLabel, { color: theme.textMuted }]}>
              {language === 'ja' ? 'Japanese' : 'Chinese'}
            </Text>
            <Pressable
              onPress={() => speak(text, language)}
              hitSlop={6}
              style={({ pressed }) => [
                s.speakBtn,
                { backgroundColor: theme.accentBg },
                pressed && { backgroundColor: theme.accentBgPressed },
              ]}
              accessibilityLabel="Play original"
            >
              <Text style={s.speakIcon}>🔊</Text>
            </Pressable>
          </View>
          <Text
            style={[s.original, { color: theme.text }]}
            selectable
          >
            {text}
          </Text>
        </View>

        <View style={[s.divider, { backgroundColor: theme.border }]} />

        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: theme.textMuted }]}>
            English
          </Text>
          <TranslationView state={state} theme={theme} onRetry={fetchTranslation} />
        </View>
      </ScrollView>

      <Text style={[s.footerNote, { color: theme.textSubtle }]}>
        {state.kind === 'ok'
          ? `Translation via ${state.source === 'mymemory' ? 'MyMemory' : state.source === 'mixed' ? 'Lingva and MyMemory' : 'Lingva'}.`
          : 'Online translation · Lingva / MyMemory'}
      </Text>
    </Pressable>
  );
}

function TranslationView({
  state,
  theme,
  onRetry,
}: {
  state:
    | { kind: 'loading' }
    | { kind: 'ok'; translation: string }
    | { kind: 'error'; message: string };
  theme: Theme;
  onRetry: () => void;
}) {
  if (state.kind === 'loading') {
    return (
      <Text style={[s.placeholder, { color: theme.textMuted }]}>
        Translating…
      </Text>
    );
  }
  if (state.kind === 'error') {
    return (
      <View style={s.errorWrap}>
        <Text style={[s.placeholder, { color: theme.destructive }]}>
          Couldn’t translate. Try again.
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            s.retryBtn,
            { backgroundColor: theme.accentBg },
            pressed && { backgroundColor: theme.accentBgPressed },
          ]}
        >
          <Text style={[s.retryText, { color: theme.accent }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Text
      testID="translation-result"
      accessibilityLabel="English translation"
      style={[s.translation, { color: theme.text }]}
      selectable
    >
      {state.translation}
    </Text>
  );
}

const s = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFill, zIndex: 1 },
  center: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: 16,
    zIndex: 2,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 16 },
  body: { paddingVertical: 14, paddingHorizontal: 18, gap: 14 },
  section: { gap: 6 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  speakBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakIcon: { fontSize: 14 },
  original: { fontSize: 19, lineHeight: 28, fontWeight: '500' },
  translation: { fontSize: 16, lineHeight: 22 },
  placeholder: { fontSize: 14, fontStyle: 'italic' },
  divider: { height: StyleSheet.hairlineWidth },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  errorWrap: { gap: 8, alignItems: 'flex-start' },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  retryText: { fontSize: 13, fontWeight: '600' },
});
