import { useRef, type ComponentRef } from 'react';
import { PanResponder, View } from 'react-native';
import { useTheme } from '../theme';

export function FontSizeSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const theme = useTheme();
  const track = useRef<ComponentRef<typeof View>>(null);
  const width = useRef(1);
  const origin = useRef(0);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const change = (pageX: number) => latest.current.onChange(Math.round(18 + Math.max(0, Math.min(1, (pageX - origin.current - 10) / Math.max(1, width.current - 20))) * 30));
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const x = event.nativeEvent.pageX;
      track.current?.measureInWindow((left) => { origin.current = left; change(x); });
    },
    onPanResponderMove: (event) => change(event.nativeEvent.pageX),
  })).current;
  const fraction = (value - 18) / 30;
  return <View ref={track} {...responder.panHandlers}
    onLayout={(event) => { width.current = event.nativeEvent.layout.width; }}
    accessible accessibilityRole="adjustable" accessibilityLabel="Font size"
    accessibilityValue={{ min: 18, max: 48, now: value, text: `${value} pixels` }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={(event) => latest.current.onChange(Math.max(18, Math.min(48, latest.current.value + (event.nativeEvent.actionName === 'increment' ? 1 : -1))))}
    style={{ height: 40, justifyContent: 'center' }}>
    <View style={{ height: 5, marginHorizontal: 10, borderRadius: 3, backgroundColor: theme.border }}>
      <View style={{ height: 5, width: `${fraction * 100}%`, borderRadius: 3, backgroundColor: theme.accent }} />
      <View style={{ position: 'absolute', left: `${fraction * 100}%`, marginLeft: -10, top: -8, height: 21, width: 21, borderRadius: 11, backgroundColor: theme.accent }} />
    </View>
  </View>;
}
