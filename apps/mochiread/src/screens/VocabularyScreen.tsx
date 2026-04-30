import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useStore } from '../state';
import { speak } from '../lib/tts';

type Props = {
  onBack: () => void;
};

export function VocabularyScreen({ onBack }: Props) {
  const { vocab, removeWord } = useStore();

  return (
    <View style={s.root}>
      <AppHeader title="Vocabulary" leading="back" onLeadingPress={onBack} />
      {vocab.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No saved words yet</Text>
          <Text style={s.emptyHint}>
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
            <View style={s.row}>
              <Pressable
                onPress={() => speak(item.word)}
                style={({ pressed }) => [s.body, pressed && s.bodyPressed]}
              >
                <Text style={s.pinyin}>{item.pinyin}</Text>
                <Text style={s.word}>{item.word}</Text>
                <Text style={s.meaning} numberOfLines={2}>
                  {item.meanings.slice(0, 4).join(' · ')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => removeWord(item.word)}
                hitSlop={10}
                style={({ pressed }) => [s.trash, pressed && s.trashPressed]}
                accessibilityLabel={`Remove ${item.word}`}
              >
                <Text style={s.trashIcon}>✕</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  list: { padding: 16 },
  sep: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    paddingRight: 8,
  },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  bodyPressed: { backgroundColor: '#f9fafb' },
  pinyin: { fontSize: 12, color: '#6b7280' },
  word: { fontSize: 22, color: '#111827', fontWeight: '700' },
  meaning: { fontSize: 13, color: '#374151', marginTop: 4 },
  trash: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashPressed: { backgroundColor: '#fee2e2' },
  trashIcon: { fontSize: 14, color: '#9ca3af', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, color: '#374151', fontWeight: '600' },
  emptyHint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },
});
