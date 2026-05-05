import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  /** Stroke width relative to the 100-unit viewBox; scales with size. */
  strokeWidth?: number;
};

/**
 * Mochi — minimalist line-art hedgehog. Single-color outline that adapts to
 * any theme via the `color` prop. Works as a small icon (24-32) or a hero
 * illustration (96-160). All paths live in a 100×100 viewBox so scaling is
 * lossless.
 */
export function Hedgehog({
  size = 96,
  color = '#111827',
  strokeWidth = 3,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Body + spike crown traced as a single closed path. The L commands in
          the middle form the zig-zag of spikes; smooth Q curves enter and
          exit the crown so the body reads round, not jagged. */}
      <Path
        d="M 18 74
           Q 8 56 28 46
           L 32 32 L 36 46 L 40 30 L 44 46 L 48 30 L 52 46 L 56 30 L 60 46 L 64 30 L 68 46
           Q 80 46 90 62
           Q 86 72 78 74
           Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Belly underline — just a hint so the silhouette doesn't look hollow. */}
      <Path
        d="M 24 74 Q 50 80 76 74"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eye */}
      <Circle cx="78" cy="58" r="2.6" fill={color} />
      {/* Nose tip */}
      <Circle cx="90" cy="62" r="1.6" fill={color} />
      {/* Two small legs */}
      <Path
        d="M 38 78 L 38 84 M 60 78 L 60 84"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
