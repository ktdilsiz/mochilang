/**
 * Selectable avatars for the user — Mochi PNG variants we already ship.
 */

import mochiMain from '../assets/mochi-main-transparent.png'
import mochiHappy from '../assets/mochi-happy.png'
import mochiSad from '../assets/mochi-sad.png'
import mochiThinking from '../assets/mochi-thinking.png'
import mochiIcon from '../assets/mochi-icon.png'

export interface AvatarOption {
  id: string
  label: string
  src: string
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'mochi-main', label: 'Mochi', src: mochiMain },
  { id: 'mochi-happy', label: 'Happy Mochi', src: mochiHappy },
  { id: 'mochi-thinking', label: 'Thinky Mochi', src: mochiThinking },
  { id: 'mochi-sad', label: 'Sleepy Mochi', src: mochiSad },
  { id: 'mochi-icon', label: 'Mochi Sketch', src: mochiIcon },
]

export function avatarById(id: string): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.id === id) ?? AVATAR_OPTIONS[0]
}
