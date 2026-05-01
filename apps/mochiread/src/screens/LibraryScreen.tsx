import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useStore } from '../state';

type Props = {
  currentText: string;
  onBack: () => void;
  onLoad: (text: string) => void;
};

export function LibraryScreen({ currentText, onBack, onLoad }: Props) {
  const { library, removeText } = useStore();

  return (
    <View style={s.root}>
      <AppHeader title="Library" leading="back" onLeadingPress={onBack} />
      {library.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No saved texts yet</Text>
          <Text style={s.emptyHint}>
            New texts are added automatically when you open them via “New
            text.”
          </Text>
        </View>
      ) : (
        <FlatList
          data={library}
          keyExtractor={(e) => e.id}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onLoad(item.text)}
              style={({ pressed }) => [
                s.row,
                item.text === currentText && s.rowCurrent,
                pressed && s.rowPressed,
              ]}
            >
              <View style={s.rowText}>
                <Text style={s.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={s.meta}>
                  {item.text === currentText
                    ? 'Currently reading'
                    : formatDate(item.createdAt)}
                </Text>
              </View>
              <Pressable
                onPress={() => removeText(item.id)}
                hitSlop={10}
                style={({ pressed }) => [s.trash, pressed && s.trashPressed]}
                accessibilityLabel={`Delete ${item.title}`}
              >
                <Text style={s.trashIcon}>✕</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function formatDate(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  list: { padding: 16 },
  sep: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  rowPressed: { backgroundColor: '#f9fafb' },
  rowCurrent: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  rowText: { flex: 1, gap: 4 },
  title: { fontSize: 16, color: '#111827', fontWeight: '600' },
  meta: { fontSize: 12, color: '#6b7280' },
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
