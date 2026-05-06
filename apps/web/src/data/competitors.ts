/**
 * Competitor roster — sourced from the generated fallback JSON.
 *
 * This file is the offline source of truth: when /api/league is
 * unreachable, the LeagueScreen builds the leaderboard from these
 * competitors plus the local user state. The xmur3-based XP calculation
 * lives here so it stays bit-for-bit aligned with the server (Go side at
 * apps/api/internal/league/league.go).
 */

import competitorsData from './generated/competitors.json'
import { seededRng } from '../lib/dates'

export interface Competitor {
  id: string
  name: string
  avatar: string
  flag: string
  rate: number
}

export const COMPETITORS: Competitor[] = competitorsData.competitors

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
