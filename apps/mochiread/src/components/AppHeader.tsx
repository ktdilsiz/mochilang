import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  title: string;
  leading?: 'menu' | 'back';
  onLeadingPress?: () => void;
  trailing?: React.ReactNode;
};

export function AppHeader({ title, leading, onLeadingPress, trailing }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        s.header,
        { backgroundColor: theme.surface, borderBottomColor: theme.border },
      ]}
    >
      <View style={s.side}>
        {leading === 'menu' && (
          <Pressable
            onPress={onLeadingPress}
            hitSlop={8}
            style={({ pressed }) => [
              s.iconBtn,
              pressed && { backgroundColor: theme.surfaceAlt },
            ]}
            accessibilityLabel="Open menu"
          >
            <View style={[s.bar, { backgroundColor: theme.text }]} />
            <View style={[s.bar, { backgroundColor: theme.text }]} />
            <View style={[s.bar, { backgroundColor: theme.text }]} />
          </Pressable>
        )}
        {leading === 'back' && (
          <Pressable
            onPress={onLeadingPress}
            hitSlop={8}
            style={({ pressed }) => [
              s.backBtn,
              pressed && { backgroundColor: theme.surfaceAlt },
            ]}
            accessibilityLabel="Back"
          >
            <Text style={[s.backChevron, { color: theme.text }]}>‹</Text>
          </Pressable>
        )}
      </View>
      <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[s.side, s.sideRight]}>{trailing}</View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 60, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  bar: {
    width: 20,
    height: 2,
    borderRadius: 1,
    marginVertical: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 32,
    lineHeight: 32,
    marginTop: -4,
  },
});
