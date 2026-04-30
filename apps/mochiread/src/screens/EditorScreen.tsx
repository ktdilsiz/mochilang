import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';

type Props = {
  initialText: string;
  onCancel: () => void;
  onCommit: (text: string) => void;
};

export function EditorScreen({ initialText, onCancel, onCommit }: Props) {
  const [draft, setDraft] = useState(initialText);

  return (
    <View style={s.root}>
      <AppHeader
        title="New text"
        leading="back"
        onLeadingPress={onCancel}
        trailing={
          <Pressable
            onPress={() => draft.trim() && onCommit(draft)}
            disabled={!draft.trim()}
            hitSlop={8}
          >
            <Text
              style={[s.commit, !draft.trim() && s.commitDisabled]}
              accessibilityLabel="Read"
            >
              Read
            </Text>
          </Pressable>
        }
      />
      <View style={s.body}>
        <Text style={s.label}>Paste Chinese text to read</Text>
        <TextInput
          multiline
          autoFocus
          placeholder="例如：你好，世界！"
          placeholderTextColor="#9ca3af"
          style={s.input}
          value={draft}
          onChangeText={setDraft}
        />
        <Text style={s.attribution}>
          Definitions: CC-CEDICT · CC BY-SA 4.0
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  body: { flex: 1, padding: 20, gap: 12 },
  label: { fontSize: 14, color: '#6b7280' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    color: '#111827',
  },
  commit: { fontSize: 16, color: '#3b82f6', fontWeight: '600' },
  commitDisabled: { color: '#9ca3af' },
  attribution: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
