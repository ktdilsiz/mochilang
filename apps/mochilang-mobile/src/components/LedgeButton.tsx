import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native'
import { colors, fontSizes, radius, space } from './../lib/theme'

/**
 * LedgeButton — RN port of the web `.ledge-button` primitive.
 *
 * Two stacked layers fake the CSS pseudo-element trick: the outer View
 * carries the dark-edge color and sits 4-5 px below the button surface,
 * giving the chunky bottom shadow that "compresses" on press when the
 * inner Pressable shifts down. The radius of the shadow matches the
 * surface's so the corners line up — at radius.md by default and
 * radius.lg for `size="lg"`.
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
  const r = isLg ? radius.lg : radius.md
  const ledgeDepth = isLg ? 5 : 4

  return (
    <View
      style={[
        styles.outer,
        { paddingBottom: ledgeDepth },
        disabled && { opacity: 0.45 },
      ]}
    >
      <View
        style={[
          styles.shadow,
          {
            backgroundColor: c.edge,
            borderRadius: r,
            top: ledgeDepth,
          },
        ]}
      />
      <Pressable
        {...rest}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: c.bg,
            borderRadius: r,
            paddingVertical: isLg ? 18 : 14,
            paddingHorizontal: isLg ? 28 : 22,
            transform: [{ translateY: pressed && !disabled ? ledgeDepth - 2 : 0 }],
          },
          tone === 'neutral' && {
            borderWidth: 2,
            borderColor: colors.border,
            paddingVertical: isLg ? 16 : 12,
            paddingHorizontal: isLg ? 26 : 20,
          },
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              color: c.fg,
              fontSize: isLg ? fontSizes.lg : fontSizes.md,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'stretch',
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Nunito_900Black',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
})

export { space }
