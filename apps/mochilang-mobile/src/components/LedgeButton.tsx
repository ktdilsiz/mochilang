import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native'
import { colors, fontSizes, radius, space } from '../lib/theme'

/**
 * LedgeButton — RN port of the web `.ledge-button` primitive. Uses a
 * stacked View hierarchy to fake the "chunky bottom shadow" effect:
 * the outer View carries the shadow color, the inner Pressable is the
 * top surface that slides down on press.
 */

type Tone = 'primary' | 'success' | 'error' | 'neutral' | 'ghost'
type Size = 'md' | 'lg'

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string
  tone?: Tone
  size?: Size
  /** Disabled visual + non-pressable state. */
  disabled?: boolean
}

const toneColors: Record<Tone, { bg: string; fg: string; edge: string }> = {
  primary: { bg: colors.primary500, fg: '#fff', edge: colors.primary700 },
  success: { bg: colors.success500, fg: '#fff', edge: colors.success700 },
  error: { bg: colors.error500, fg: '#fff', edge: colors.error700 },
  neutral: { bg: colors.surface, fg: colors.text, edge: colors.border },
  ghost: { bg: 'transparent', fg: colors.textMuted, edge: 'transparent' },
}

export default function LedgeButton({
  label,
  tone = 'primary',
  size = 'md',
  disabled,
  ...rest
}: Props) {
  const c = toneColors[tone]
  const isLg = size === 'lg'
  return (
    <View style={[{ marginBottom: 4 }, disabled && { opacity: 0.45 }]}>
      <View style={[styles.shadow, { backgroundColor: c.edge }]} />
      <Pressable
        {...rest}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: c.bg,
            borderRadius: isLg ? radius.lg : radius.md,
            paddingVertical: isLg ? 18 : 14,
            paddingHorizontal: isLg ? 28 : 22,
            transform: [{ translateY: pressed ? 2 : 0 }],
          },
          tone === 'neutral' && { borderWidth: 2, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.label,
            { color: c.fg, fontSize: isLg ? fontSizes.lg : fontSizes.md },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 0,
    borderRadius: radius.md,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})

export { space }
