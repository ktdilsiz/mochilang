import { Image, type ImageStyle, type StyleProp } from 'react-native';

const MOCHI = require('../../assets/mochi.png');

type Props = {
  size?: number;
  /**
   * Kept for compatibility with the previous SVG version. Ignored by the
   * raster mascot — the PNG is fully colored and identical in light/dark
   * mode. Callers don't need to update.
   */
  color?: string;
  /**
   * Kept for compatibility. Ignored by the raster mascot.
   */
  strokeWidth?: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * Mochi the hedgehog — the canonical mascot. Render via a single PNG asset
 * so the artwork stays identical to whatever you generated. Use the `size`
 * prop to scale; the source is 1024×1024 so it stays crisp from icon to
 * hero size.
 */
export function Hedgehog({ size = 96, style }: Props) {
  return (
    <Image
      source={MOCHI}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Mochi the hedgehog"
    />
  );
}
