import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Hedgehog } from '../components/Hedgehog';
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

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= library.length) return;
    const next = library.slice();
    [next[index], next[target]] = [next[target], next[index]];
    reorderLibrary(next);
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <AppHeader title="Library" leading="back" onLeadingPress={onBack} />
      {library.length === 0 ? (
        <View style={s.empty}>
          <Hedgehog size={88} color={theme.textMuted} strokeWidth={3} />
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
          renderItem={({ item, index }) => (
            <Row
              item={item}
              isCurrent={item.text === currentText}
              isFirst={index === 0}
              isLast={index === library.length - 1}
              theme={theme}
              onLoad={onLoad}
              onRemove={removeText}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
            />
          )}
        />
      )}
    </View>
  );
}

function Row({
  item,
  isCurrent,
  isFirst,
  isLast,
  theme,
  onLoad,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: LibraryEntry;
  isCurrent: boolean;
  isFirst: boolean;
  isLast: boolean;
  theme: Theme;
  onLoad: (text: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Pressable
      onPress={() => onLoad(item.text)}
      style={({ pressed }) => [
        s.row,
        {
          backgroundColor: isCurrent ? theme.accentBg : theme.surface,
          borderColor: isCurrent ? theme.accent : theme.border,
        },
        pressed && { backgroundColor: theme.surfaceAlt },
      ]}
    >
      <View style={s.moveCol}>
        <ArrowBtn
          label="↑"
          onPress={onMoveUp}
          disabled={isFirst}
          theme={theme}
          accessibilityLabel="Move up"
        />
        <ArrowBtn
          label="↓"
          onPress={onMoveDown}
          disabled={isLast}
          theme={theme}
          accessibilityLabel="Move down"
        />
      </View>
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

function ArrowBtn({
  label,
  onPress,
  disabled,
  theme,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  theme: Theme;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        s.arrow,
        pressed && !disabled && { backgroundColor: theme.surfaceAlt },
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      <Text
        style={[
          s.arrowText,
          { color: disabled ? theme.border : theme.textMuted },
        ]}
      >
        {label}
      </Text>
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
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  moveCol: { gap: 0 },
  arrow: {
    width: 28,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  arrowText: { fontSize: 16, fontWeight: '700', lineHeight: 18 },
  rowText: { flex: 1, gap: 4, paddingVertical: 4 },
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyHint: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
