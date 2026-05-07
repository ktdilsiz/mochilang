/**
 * Friend roster — sourced from the generated fallback JSON.
 *
 * Offline-mode source for FriendsScreen. The xmur3 sparkline computation
 * stays here so the bars match the API output bit-for-bit.
 */

import friendsData from './generated/friends.json'
import { seededRng } from '@mochilang/shared'

export interface Friend {
  id: string
  name: string
  handle: string
  avatar: string
  flag: string
  totalXp: number
  streak: number
  languages: string[]
  weekly: number
}

export const FRIENDS: Friend[] = friendsData.friends

export function friendDailyXp(
  friend: Friend,
  weekStart: string,
  dayOffset: number
): number {
  const rng = seededRng(`${friend.id}|${weekStart}|d${dayOffset}`)
  const r = rng()
  const base = friend.weekly / 7
  if (r < 0.18) return Math.round(base * 0.15)
  return Math.round(base * (0.7 + r * 0.7))
}

export function friendWeeklyXp(
  friend: Friend,
  weekStart: string,
  daysIntoWeek: number
): number {
  let total = 0
  const cap = Math.max(0, Math.min(6, daysIntoWeek))
  for (let d = 0; d <= cap; d++) total += friendDailyXp(friend, weekStart, d)
  return total
}
