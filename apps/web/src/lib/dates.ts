/**
 * Date + deterministic-hash helpers used by the league/social features.
 *
 * The leaderboard re-renders the same numbers across reloads (and across
 * users — there's no backend yet) by seeding bot XP from (weekStart, botId).
 * The week always starts on Monday in the user's local timezone.
 */

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function mondayOf(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0=Sun..6=Sat
  const offsetToMon = (day + 6) % 7 // Sun→6, Mon→0, ... Sat→5
  d.setDate(d.getDate() - offsetToMon)
  return ymd(d)
}

export function daysSinceMonday(date: Date = new Date()): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return (d.getDay() + 6) % 7
}

export function daysUntilMonday(date: Date = new Date()): number {
  return 6 - daysSinceMonday(date)
}

/** xmur3: small fast string hash; returns a rng() that yields [0,1). */
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}
