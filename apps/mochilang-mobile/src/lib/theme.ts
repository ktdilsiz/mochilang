/**
 * Mochilang theme tokens for React Native.
 *
 * Mirrors apps/web/src/index.css's CSS custom properties so screens
 * keep the same warm-cream / coral palette across web and native. The
 * "ledge button" treatment (chunky bottom shadow) is implemented per
 * component since RN doesn't have CSS pseudo-elements; the shape lives
 * here as a constant so primitives can compose it.
 */

export const colors = {
  cream50: '#fffbf2',
  cream100: '#fff4dd',
  cream200: '#ffe7be',
  tan300: '#f0c98c',
  tan400: '#d9a35f',
  brown600: '#8a5a36',
  brown700: '#6b4226',
  brown900: '#3a2516',

  primary100: '#ffe2d6',
  primary300: '#ff9a73',
  primary500: '#ff6b3d',
  primary700: '#d3502a',

  success100: '#d7f5b5',
  success300: '#93dd5d',
  success500: '#58cc02',
  success700: '#3a8c00',

  error100: '#ffe0e0',
  error300: '#ff8a8a',
  error500: '#ff4b4b',
  error700: '#c43232',

  xp100: '#fff0bd',
  xp300: '#ffd84a',
  xp500: '#ffc107',
  xp700: '#b88a00',

  bg: '#fffbf2',
  surface: '#ffffff',
  surfaceAlt: '#fff4dd',
  border: '#efe6d2',
  text: '#3a2516',
  textMuted: '#8a5a36',
  textSubtle: '#b09c83',
} as const

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 32,
} as const

/**
 * Per-theme color sets used by topic banners + lesson nodes. Same hues
 * as the web app's data-theme CSS rules (HomeScreen.css). The triple
 * is { bg, edge, fg } — bg behind the banner, edge for the bottom-
 * shadow line, fg for the icon.
 */
export const themeTints: Record<
  string,
  { bg: string; edge: string; edgeDeep: string; fg: string }
> = {
  greetings: { bg: '#fff4d6', edge: '#ffd97a', edgeDeep: '#d9a93d', fg: '#b8772f' },
  numbers: { bg: '#e0ecff', edge: '#9cc1ff', edgeDeep: '#5a8be0', fg: '#335fa8' },
  basics: { bg: '#ece6db', edge: '#c4b89d', edgeDeep: '#8a7d65', fg: '#6b5d44' },
  family: { bg: '#ffe1ec', edge: '#ffa6c2', edgeDeep: '#e26e96', fg: '#b94a72' },
  verbs: { bg: '#ece1ff', edge: '#c1a6f5', edgeDeep: '#8d6cd6', fg: '#6b48b3' },
  food: { bg: '#ffe6d1', edge: '#ffb27a', edgeDeep: '#e07c3a', fg: '#b35a1f' },
  location: { bg: '#d8f0d4', edge: '#92cf86', edgeDeep: '#5da953', fg: '#3d7e36' },
  directions: { bg: '#d8f0d4', edge: '#92cf86', edgeDeep: '#5da953', fg: '#3d7e36' },
  time: { bg: '#d6f1f3', edge: '#79cdd0', edgeDeep: '#3d9da1', fg: '#257073' },
  questions: { bg: '#ffe0d6', edge: '#ff9e85', edgeDeep: '#d96446', fg: '#a44229' },
  colors: { bg: '#ffe1f6', edge: '#ff9bdc', edgeDeep: '#d36ab1', fg: '#a23e88' },
  weather: { bg: '#d8eaff', edge: '#84baff', edgeDeep: '#4f8fdc', fg: '#2d629f' },
  review: { bg: '#fff0bd', edge: '#ffd84a', edgeDeep: '#d3a300', fg: '#8a6500' },
}

export function tintForTheme(theme: string) {
  return themeTints[theme] ?? themeTints.basics
}
