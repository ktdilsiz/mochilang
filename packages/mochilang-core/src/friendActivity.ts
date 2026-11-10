/**
 * Deterministic friend activity math — used by the Friends sparkline.
 *
 * Server source of truth lives in apps/api/internal/server/handlers_friends.go
 * (`friendDailyXP`). The web client has a near-identical copy in
 * apps/web/src/data/friends.ts. This shared version takes primitives so
 * both clients can call it from offline paths against the bundled friend
 * roster (which only carries the static seed fields — id + weekly).
 *
 * Whatever rolls these dice must keep matching the server, since the
 * sparkline next to a friend's row should be bit-for-bit identical
 * whether the data came from /api/friends or the offline bundle.
 */

import { seededRng } from './dates'

export function friendDailyXp(
  friendId: string,
  weekly: number,
  weekStart: string,
  dayOffset: number,
): number {
  const rng = seededRng(`${friendId}|${weekStart}|d${dayOffset}`)
  const r = rng()
  const base = weekly / 7
  if (r < 0.18) return Math.round(base * 0.15)
  return Math.round(base * (0.7 + r * 0.7))
}

/**
 * Sum of friendDailyXp from Monday through `daysIntoWeek` (inclusive,
 * 0-based). Future days don't contribute, matching server behavior.
 */
export function friendWeeklyXp(
  friendId: string,
  weekly: number,
  weekStart: string,
  daysIntoWeek: number,
): number {
  let total = 0
  const cap = Math.max(0, Math.min(6, daysIntoWeek))
  for (let d = 0; d <= cap; d++) {
    total += friendDailyXp(friendId, weekly, weekStart, d)
  }
  return total
}

/**
 * Full 7-day daily array — entries past `daysIntoWeek` are 0. Convenience
 * wrapper so screens that need both daily + thisWeek can compute them in
 * one pass.
 */
export function friendWeekActivity(
  friendId: string,
  weekly: number,
  weekStart: string,
  daysIntoWeek: number,
): { daily: number[]; thisWeek: number } {
  const daily = new Array(7).fill(0) as number[]
  const cap = Math.max(0, Math.min(6, daysIntoWeek))
  let thisWeek = 0
  for (let d = 0; d <= cap; d++) {
    const xp = friendDailyXp(friendId, weekly, weekStart, d)
    daily[d] = xp
    thisWeek += xp
  }
  return { daily, thisWeek }
}
