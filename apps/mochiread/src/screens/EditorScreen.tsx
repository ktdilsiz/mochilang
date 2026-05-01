import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme';

type Props = {
  initialText: string;
  onCancel: () => void;
  onCommit: (text: string) => void;
};

export function EditorScreen({ initialText, onCancel, onCommit }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState(initialText);
  const isEmpty = !draft.trim();

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader
        title="New text"
        leading="back"
        onLeadingPress={onCancel}
        trailing={
          <Pressable
            onPress={() => !isEmpty && onCommit(draft)}
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
          Paste Chinese text to read
        </Text>
        <TextInput
          multiline
          autoFocus
          placeholder="例如：你好，世界！"
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
          Definitions: CC-CEDICT · CC BY-SA 4.0
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
