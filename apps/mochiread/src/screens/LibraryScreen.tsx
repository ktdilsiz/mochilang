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

type Props = {
  currentText: string;
  onBack: () => void;
  onLoad: (text: string) => void;
};

export function LibraryScreen({ currentText, onBack, onLoad }: Props) {
  const { library, removeText } = useStore();
  const theme = useTheme();

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Library" leading="back" onLeadingPress={onBack} />
      {library.length === 0 ? (
        <View style={s.empty}>
          <Text style={[s.emptyTitle, { color: theme.text }]}>
            No saved texts yet
          </Text>
          <Text style={[s.emptyHint, { color: theme.textMuted }]}>
            New texts are added automatically when you open them via "New
            text."
          </Text>
        </View>
      ) : (
        <FlatList
          data={library}
          keyExtractor={(e) => e.id}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => {
            const isCurrent = item.text === currentText;
            return (
              <Pressable
                onPress={() => onLoad(item.text)}
                style={({ pressed }) => [
                  s.row,
                  {
                    backgroundColor: isCurrent
                      ? theme.accentBg
                      : theme.surface,
                    borderColor: isCurrent ? theme.accent : theme.border,
                  },
                  pressed && { backgroundColor: theme.surfaceAlt },
                ]}
              >
                <View style={s.rowText}>
                  <Text
                    style={[s.title, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={[s.meta, { color: theme.textMuted }]}>
                    {isCurrent
                      ? 'Currently reading'
                      : formatDate(item.createdAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => removeText(item.id)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    s.trash,
                    pressed && { backgroundColor: theme.destructiveBg },
                  ]}
                  accessibilityLabel={`Delete ${item.title}`}
                >
                  <Text style={[s.trashIcon, { color: theme.textSubtle }]}>
                    ✕
                  </Text>
                </Pressable>
              </Pressable>
            );
          }}
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
  root: { flex: 1 },
  list: { padding: 16 },
  sep: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12 },
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
