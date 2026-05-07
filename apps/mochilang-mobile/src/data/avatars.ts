/**
 * Selectable avatars for the user — Mochi PNG variants we ship with the
 * mobile bundle. Mirror of apps/web/src/data/avatars.ts but uses
 * `require()` for static-asset references (the React Native idiom for
 * Metro to fingerprint and bundle the image).
 */

import type { ImageSourcePropType } from 'react-native'

export interface AvatarOption {
  id: string
  label: string
  src: ImageSourcePropType
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'mochi-main',
    label: 'Mochi',
    src: require('../../assets/mochi-main-transparent.png'),
  },
  {
    id: 'mochi-happy',
    label: 'Happy Mochi',
    src: require('../../assets/mochi-happy.png'),
  },
  {
    id: 'mochi-thinking',
    label: 'Thinky Mochi',
    src: require('../../assets/mochi-thinking.png'),
  },
  {
    id: 'mochi-sad',
    label: 'Sleepy Mochi',
    src: require('../../assets/mochi-sad.png'),
  },
  {
    id: 'mochi-icon',
    label: 'Mochi Sketch',
    src: require('../../assets/mochi-icon.png'),
  },
]

export function avatarById(id: string): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.id === id) ?? AVATAR_OPTIONS[0]
}
