/**
 * Mobile competitor roster — bundled JSON for offline-mode rendering
 * of the League screen. Mirrors apps/web/src/data/competitors.ts so
 * the offline leaderboard math is identical on both clients. Stays
 * bit-for-bit aligned with the server (apps/api/internal/league).
 */

import { seededRng } from '@mochilang/shared'
import competitorsData from '../../assets/competitors.json'

export interface Competitor {
  id: string
  name: string
  avatar: string
  flag: string
  rate: number
}

export const COMPETITORS: Competitor[] = (
  competitorsData as { competitors: Competitor[] }
).competitors

function dailyXp(bot: Competitor, weekStart: string, dayOffset: number): number {
  const rng = seededRng(`${bot.id}|${weekStart}|d${dayOffset}`)
  const a = rng()
  const b = rng()
  let mult: number
  if (a < 0.25) mult = 0.1 + b * 0.3
  else if (a < 0.35) mult = 1.4 + b * 0.4
  else mult = 0.6 + b * 0.7
  return Math.round(bot.rate * mult)
}

export function botWeeklyXp(
  bot: Competitor,
  weekStart: string,
  daysIntoWeek: number
): number {
  let total = 0
  const cap = Math.max(0, Math.min(6, daysIntoWeek))
  for (let d = 0; d <= cap; d++) total += dailyXp(bot, weekStart, d)
  return total
}
