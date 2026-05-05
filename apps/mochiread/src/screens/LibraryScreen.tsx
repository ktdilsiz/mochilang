import { Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { AppHeader } from '../components/AppHeader';
import { useStore, type LibraryEntry } from '../state';
import { useTheme, type Theme } from '../theme';

type Props = {
  currentText: string;
  onBack: () => void;
  onLoad: (text: string) => void;
};

export function LibraryScreen({ currentText, onBack, onLoad }: Props) {
  const { library, removeText, reorderLibrary } = useStore();
  const theme = useTheme();

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<LibraryEntry>) => {
    const isCurrent = item.text === currentText;
    return (
      <ScaleDecorator>
        <Row
          item={item}
          isCurrent={isCurrent}
          isActive={isActive}
          theme={theme}
          onLoad={onLoad}
          onRemove={removeText}
          onLongPress={drag}
        />
      </ScaleDecorator>
    );
  };

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
        <DraggableFlatList
          data={library}
          keyExtractor={(e) => e.id}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          onDragEnd={({ data }) => reorderLibrary(data)}
          renderItem={renderItem}
          activationDistance={10}
        />
      )}
      {library.length > 1 && (
        <Text style={[s.hint, { color: theme.textSubtle }]}>
          Long-press an entry to reorder · tap to open · ✕ to delete
        </Text>
      )}
    </View>
  );
}

function Row({
  item,
  isCurrent,
  isActive,
  theme,
  onLoad,
  onRemove,
  onLongPress,
}: {
  item: LibraryEntry;
  isCurrent: boolean;
  isActive: boolean;
  theme: Theme;
  onLoad: (text: string) => void;
  onRemove: (id: string) => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => onLoad(item.text)}
      onLongPress={onLongPress}
      delayLongPress={250}
      style={({ pressed }) => [
        s.row,
        {
          backgroundColor: isCurrent ? theme.accentBg : theme.surface,
          borderColor: isCurrent ? theme.accent : theme.border,
        },
        pressed && !isActive && { backgroundColor: theme.surfaceAlt },
        isActive && {
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
          borderColor: theme.accent,
        },
      ]}
    >
      <Text style={[s.handle, { color: theme.textSubtle }]}>⋮⋮</Text>
      <View style={s.rowText}>
        <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[s.meta, { color: theme.textMuted }]}>
          {isCurrent ? 'Currently reading' : formatDate(item.createdAt)}
        </Text>
      </View>
      <Pressable
        onPress={() => onRemove(item.id)}
        hitSlop={10}
        style={({ pressed }) => [
          s.trash,
          pressed && { backgroundColor: theme.destructiveBg },
        ]}
        accessibilityLabel={`Delete ${item.title}`}
      >
        <Text style={[s.trashIcon, { color: theme.textSubtle }]}>✕</Text>
      </Pressable>
    </Pressable>
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
    gap: 8,
  },
  handle: { fontSize: 16, fontWeight: '700', letterSpacing: -2 },
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
  hint: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
