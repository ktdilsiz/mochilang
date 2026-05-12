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
 * Nunito font-family names — must match the keys we hand to `useFonts`
 * in App.tsx. RN's StyleSheet doesn't have a CSS-cascade for fontFamily,
 * so screens pass these through fontWeight equivalents:
 *
 *   400 → Nunito_400Regular
 *   600 → Nunito_600SemiBold
 *   700 → Nunito_700Bold
 *   800 → Nunito_800ExtraBold
 *   900 → Nunito_900Black
 *
 * Use `fontForWeight(weight)` to map a string fontWeight to the right
 * family. Falls back to the system font if Nunito hasn't loaded yet
 * (so first-paint doesn't crash).
 */
export const fonts = {
  '400': 'Nunito_400Regular',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_900Black',
} as const

type FontWeight = '400' | '600' | '700' | '800' | '900'

export function fontForWeight(weight: FontWeight): string {
  return fonts[weight]
}

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
  // Original Chinese-leaning palette.
  greetings: { bg: '#fff4d6', edge: '#ffd97a', edgeDeep: '#d9a93d', fg: '#b8772f' },
  numbers: { bg: '#e0ecff', edge: '#9cc1ff', edgeDeep: '#5a8be0', fg: '#335fa8' },
  basics: { bg: '#ece6db', edge: '#c4b89d', edgeDeep: '#8a7d65', fg: '#6b5d44' },
  family: { bg: '#ffe1ec', edge: '#ffa6c2', edgeDeep: '#e26e96', fg: '#b94a72' },
  verbs: { bg: '#ece1ff', edge: '#c1a6f5', edgeDeep: '#8d6cd6', fg: '#6b48b3' },
  verb: { bg: '#ece1ff', edge: '#c1a6f5', edgeDeep: '#8d6cd6', fg: '#6b48b3' },
  food: { bg: '#ffe6d1', edge: '#ffb27a', edgeDeep: '#e07c3a', fg: '#b35a1f' },
  location: { bg: '#d8f0d4', edge: '#92cf86', edgeDeep: '#5da953', fg: '#3d7e36' },
  directions: { bg: '#d8f0d4', edge: '#92cf86', edgeDeep: '#5da953', fg: '#3d7e36' },
  time: { bg: '#d6f1f3', edge: '#79cdd0', edgeDeep: '#3d9da1', fg: '#257073' },
  questions: { bg: '#ffe0d6', edge: '#ff9e85', edgeDeep: '#d96446', fg: '#a44229' },
  colors: { bg: '#ffe1f6', edge: '#ff9bdc', edgeDeep: '#d36ab1', fg: '#a23e88' },
  weather: { bg: '#d8eaff', edge: '#84baff', edgeDeep: '#4f8fdc', fg: '#2d629f' },
  review: { bg: '#fff0bd', edge: '#ffd84a', edgeDeep: '#d3a300', fg: '#8a6500' },

  // en-tr course themes — most en-tr lessons tag with these. Without
  // entries here they all fall back to the beige `basics` palette,
  // making the whole path read as one bland color.
  grammar: { bg: '#dfeed4', edge: '#9ec97d', edgeDeep: '#6b9a4d', fg: '#4a6e36' },
  vocabulary: { bg: '#ece1ff', edge: '#bea1f0', edgeDeep: '#8b6cc5', fg: '#5e478f' },
  vocab: { bg: '#ece1ff', edge: '#bea1f0', edgeDeep: '#8b6cc5', fg: '#5e478f' },
  tense: { bg: '#fff3d4', edge: '#f0c84a', edgeDeep: '#c69a1c', fg: '#8a6b00' },
  speaking: { bg: '#ffe3dc', edge: '#ffab9a', edgeDeep: '#dc7361', fg: '#a14a39' },
  literary: { bg: '#e6dcf0', edge: '#a78bcf', edgeDeep: '#7459a5', fg: '#4f3c80' },
  topics: { bg: '#dceffc', edge: '#86c2ee', edgeDeep: '#4a8bbf', fg: '#2c5a86' },
  writing: { bg: '#dde6f3', edge: '#8aa6cf', edgeDeep: '#5878ac', fg: '#324f78' },
  reading: { bg: '#d6ead6', edge: '#86b888', edgeDeep: '#558759', fg: '#3a5d3a' },
  alphabet: { bg: '#fff0c2', edge: '#f0c84a', edgeDeep: '#c69a1c', fg: '#8a6b00' },
  pronouns: { bg: '#ffe1ec', edge: '#f5a6c0', edgeDeep: '#cf6e93', fg: '#a04a70' },
  shopping: { bg: '#d6f1d6', edge: '#7fce8e', edgeDeep: '#4f9a5a', fg: '#3a6e3e' },
  tobe: { bg: '#ffe6d8', edge: '#ffa482', edgeDeep: '#d9714d', fg: '#9c4828' },
  academic: { bg: '#dde2ed', edge: '#8b9bbe', edgeDeep: '#566a92', fg: '#324569' },
  arts: { bg: '#f1ddf0', edge: '#c193c0', edgeDeep: '#8d5e90', fg: '#5e3e63' },
  news: { bg: '#e2e2e0', edge: '#a4a49d', edgeDeep: '#727264', fg: '#4d4d44' },
  places: { bg: '#e8eccc', edge: '#b4bf7a', edgeDeep: '#7e8a44', fg: '#56602f' },
  media: { bg: '#f1d8e0', edge: '#cf809a', edgeDeep: '#9c526b', fg: '#6e394a' },
  feelings: { bg: '#ffe5cc', edge: '#f5b378', edgeDeep: '#cb834a', fg: '#8c552f' },
  phrasal: { bg: '#dadcef', edge: '#9293cf', edgeDeep: '#5f5ea3', fg: '#403e7a' },
  articles: { bg: '#ebe7df', edge: '#bdb6a4', edgeDeep: '#83795e', fg: '#5a523e' },
  conditional: { bg: '#e0d6ee', edge: '#a78bcf', edgeDeep: '#7459a5', fg: '#4f3c80' },
  modal: { bg: '#dce0e8', edge: '#8993ab', edgeDeep: '#576280', fg: '#37405a' },
  passive: { bg: '#e7e1d6', edge: '#b7a98e', edgeDeep: '#85795e', fg: '#5a503d' },
}

export function tintForTheme(theme: string) {
  return themeTints[theme] ?? themeTints.basics
}
