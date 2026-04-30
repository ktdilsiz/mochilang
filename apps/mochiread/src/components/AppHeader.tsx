import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  leading?: 'menu' | 'back';
  onLeadingPress?: () => void;
  trailing?: React.ReactNode;
};

export function AppHeader({ title, leading, onLeadingPress, trailing }: Props) {
  return (
    <View style={s.header}>
      <View style={s.side}>
        {leading === 'menu' && (
          <Pressable
            onPress={onLeadingPress}
            hitSlop={8}
            style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
            accessibilityLabel="Open menu"
          >
            <View style={s.bar} />
            <View style={s.bar} />
            <View style={s.bar} />
          </Pressable>
        )}
        {leading === 'back' && (
          <Pressable
            onPress={onLeadingPress}
            hitSlop={8}
            style={({ pressed }) => [s.backBtn, pressed && s.iconBtnPressed]}
            accessibilityLabel="Back"
          >
            <Text style={s.backChevron}>‹</Text>
          </Pressable>
        )}
      </View>
      <Text style={s.title} numberOfLines={1}>
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
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  side: { width: 60, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
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
  iconBtnPressed: { backgroundColor: '#f3f4f6' },
  bar: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#111827',
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
    color: '#111827',
    marginTop: -4,
  },
});
