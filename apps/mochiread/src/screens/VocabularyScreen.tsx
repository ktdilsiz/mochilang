import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useStore } from '../state';
import { useTheme } from '../theme';
import { speak } from '../lib/tts';

type Props = {
  onBack: () => void;
};

export function VocabularyScreen({ onBack }: Props) {
  const { vocab, removeWord } = useStore();
  const theme = useTheme();

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Vocabulary" leading="back" onLeadingPress={onBack} />
      {vocab.length === 0 ? (
        <View style={s.empty}>
          <Text style={[s.emptyTitle, { color: theme.text }]}>
            No saved words yet
          </Text>
          <Text style={[s.emptyHint, { color: theme.textMuted }]}>
            While reading, tap a word and hit ★ to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={vocab}
          keyExtractor={(e) => e.word}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => (
            <View
              style={[
                s.row,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Pressable
                onPress={() => speak(item.word)}
                style={({ pressed }) => [
                  s.body,
                  pressed && { backgroundColor: theme.surfaceAlt },
                ]}
              >
                <Text style={[s.pinyin, { color: theme.textMuted }]}>
                  {item.pinyin}
                </Text>
                <Text style={[s.word, { color: theme.text }]}>
                  {item.word}
                </Text>
                <Text
                  style={[s.meaning, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {item.meanings.slice(0, 4).join(' · ')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => removeWord(item.word)}
                hitSlop={10}
                style={({ pressed }) => [
                  s.trash,
                  pressed && { backgroundColor: theme.destructiveBg },
                ]}
                accessibilityLabel={`Remove ${item.word}`}
              >
                <Text style={[s.trashIcon, { color: theme.textSubtle }]}>
                  ✕
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16 },
  sep: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingRight: 8,
  },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  pinyin: { fontSize: 12 },
  word: { fontSize: 22, fontWeight: '700' },
  meaning: { fontSize: 13, marginTop: 4 },
  trash: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIcon: { fontSize: 14, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyHint: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
