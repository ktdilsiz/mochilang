import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import type { ReadingLanguage } from '../../storage/schema';
import { useTheme } from '../../theme';

type Props = {
  initialText: string;
  initialLanguage: ReadingLanguage;
  onCancel: () => void;
  onCommit: (text: string, language: ReadingLanguage) => void;
};

export function EditorScreen({
  initialText,
  initialLanguage,
  onCancel,
  onCommit,
}: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState(initialText);
  const language = initialLanguage;
  const isEmpty = !draft.trim();

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="New text"
        leading="back"
        onLeadingPress={onCancel}
        trailing={
          <Pressable
            onPress={() => !isEmpty && onCommit(draft, language)}
            disabled={isEmpty}
            hitSlop={8}
          >
            <Text
              style={[
                s.commit,
                { color: isEmpty ? theme.textSubtle : theme.accent },
              ]}
            >
              Read
            </Text>
          </Pressable>
        }
      />
      <View style={s.body}>
        <Text style={[s.label, { color: theme.textMuted }]}>
          Paste {language === 'ja' ? 'Japanese' : 'Chinese'} text to read
        </Text>
        <TextInput
          multiline
          autoFocus
          placeholder={
            language === 'ja'
              ? '例：こんにちは、世界！'
              : '例如：你好，世界！'
          }
          placeholderTextColor={theme.textSubtle}
          style={[
            s.input,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={draft}
          onChangeText={setDraft}
        />
        <Text style={[s.attribution, { color: theme.textSubtle }]}>
          {language === 'ja'
            ? 'Definitions: JMdict · EDRDG · CC BY-SA 4.0'
            : 'Definitions: CC-CEDICT · CC BY-SA 4.0'}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, padding: 20, gap: 12 },
  label: { fontSize: 14 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  commit: { fontSize: 16, fontWeight: '600' },
  attribution: { fontSize: 11, textAlign: 'center' },
});
