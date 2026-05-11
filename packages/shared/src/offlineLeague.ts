/**
 * Offline / adaptive league.
 *
 * When no auth-backed server cohort is available, we generate a 30-bot
 * league locally and let the bots earn XP off the user's own progress:
 * once per day, every bot picks up a fraction of the XP the user
 * earned that day. The fraction tapers with rank, so the top bots
 * mostly track the user while the tail falls behind.
 *
 * The generator is deterministic-by-weekStart — same week → same
 * cohort, so a reinstall or a state wipe lands on the same neighbors.
 * A different weekStart picks a different subset of the name pool, so
 * each week brings fresh faces.
 *
 * Math:
 *   share(rank) = TOP_BOT_SHARE * DECAY_PER_RANK^(rank-1)
 *   bot.weeklyXp += round(share(rank) * userDailyXp)
 *
 * With TOP_BOT_SHARE=0.8 and DECAY_PER_RANK=0.92 on a 31-cohort, the
 * top bot keeps pace at 80% of your day, mid-pack is ~30–40%, and the
 * tail is ~6%. Adjust the constants if the curve feels off.
 */

import { seededRng } from './dates'

export const TOP_BOT_SHARE = 0.8
export const DECAY_PER_RANK = 0.92
export const OFFLINE_COHORT_SIZE = 30 // bots only; user makes 31

export interface OfflineBot {
  id: string
  name: string
  avatar: string
  flag: string
  weeklyXp: number
}

/**
 * Share of the user's daily XP that the bot at rank N (1-indexed)
 * picks up overnight. Pure function; the same rank always returns the
 * same multiplier.
 */
export function botShareForRank(rank: number): number {
  if (rank < 1) return TOP_BOT_SHARE
  return TOP_BOT_SHARE * Math.pow(DECAY_PER_RANK, rank - 1)
}

/**
 * Apply one day's settlement: sort bots by current weeklyXp, then
 * award each bot share(rank) * userXpToday rounded to the nearest int.
 * userXpToday is clamped at 0 (negative deltas — e.g. week rollover —
 * mean "no XP credit").
 */
export function settleDay(cohort: OfflineBot[], userXpToday: number): OfflineBot[] {
  const earned = Math.max(0, Math.round(userXpToday))
  // Stable order: weeklyXp desc, then id asc for deterministic ties.
  const sorted = [...cohort].sort(
    (a, b) => b.weeklyXp - a.weeklyXp || a.id.localeCompare(b.id),
  )
  return sorted.map((bot, idx) => ({
    ...bot,
    weeklyXp: bot.weeklyXp + Math.round(botShareForRank(idx + 1) * earned),
  }))
}

// ---------- Cohort generation ----------

// Three independent pools that get sampled per-row. Pool sizes are
// intentionally larger than OFFLINE_COHORT_SIZE so the seeded sampler
// has variety to draw from across weeks; the seed picks a different
// subset / shuffle each weekStart.

const NAME_POOL = [
  'Wei', 'Aiko', 'Marco', 'Priya', 'Liam', 'Sofia', 'Kenji', 'Amara',
  'Mateo', 'Yuki', 'Hugo', 'Nora', 'Diego', 'Lin', 'Ravi', 'Elena',
  'Tomás', 'Mei', 'Otto', 'Anya', 'Pablo', 'Hana', 'Finn', 'Aria',
  'Niko', 'Sora', 'Iván', 'Léa', 'Saanvi', 'Aleks', 'Ines', 'Asha',
  'Tariq', 'Cleo', 'Bruno', 'Tara', 'Yusuf', 'Olga', 'Hiro', 'Camille',
  'Jonas', 'Léna', 'Mireia', 'Tomek', 'Naima', 'Andrei', 'Saskia',
  'Carlos', 'Daria', 'Felix', 'Iliana', 'Kazem', 'Lula', 'Magnus',
  'Nina', 'Patel', 'Rasmus', 'Sarai', 'Theo', 'Uma', 'Viktor', 'Wren',
  'Xun', 'Yara', 'Zane', 'Beatriz', 'Dalia', 'Eli', 'Fátima', 'Gunnar',
  'Hema', 'Jules', 'Karim', 'Lola', 'Maya', 'Naomi', 'Oren', 'Penny',
  'Quincy', 'Rita', 'Sami', 'Tess', 'Vera', 'Wendy', 'Xochitl', 'Yann',
  'Zara',
] as const

const FLAG_POOL = [
  '🇨🇳', '🇯🇵', '🇮🇹', '🇮🇳', '🇮🇪', '🇪🇸', '🇳🇬', '🇲🇽', '🇰🇷', '🇫🇷',
  '🇸🇪', '🇨🇴', '🇷🇺', '🇧🇷', '🇩🇪', '🇺🇦', '🇦🇷', '🇫🇮', '🇹🇼', '🇻🇳',
  '🇹🇷', '🇬🇧', '🇨🇦', '🇺🇸', '🇦🇺', '🇳🇿', '🇿🇦', '🇪🇬', '🇮🇩', '🇲🇾',
  '🇵🇭', '🇹🇭', '🇵🇰', '🇮🇷', '🇵🇹',
] as const

const AVATAR_POOL = [
  '🐯', '🦊', '🐼', '🦋', '🐶', '🐰', '🐉', '🦁', '🐺', '🐧',
  '🦔', '🦉', '🐲', '🐨', '🐘', '🦄', '🐢', '🐌', '🐗', '🐱',
  '🐹', '🐸', '🐙', '🐻', '🐮', '🦘', '🦥', '🦦', '🦝', '🦃',
  '🦜', '🦚', '🦅', '🦆',
] as const

/**
 * Knuth shuffle driven by a deterministic rng. Returns a new array;
 * input is not mutated.
 */
function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Generate a fresh 30-bot cohort for a given weekStart. The result is
 * deterministic per weekStart so reinstalls land on the same names.
 * `startingXp` is the floor for bot weeklyXp at generation time (use
 * 0 at week rollover; mid-week recovery scenarios might want a small
 * positive value, but that's the caller's call).
 */
export function generateCohort(
  weekStart: string,
  startingXp = 0,
): OfflineBot[] {
  const rng = seededRng(`offline-league|${weekStart}`)
  const names = shuffled(NAME_POOL, rng)
  const flags = shuffled(FLAG_POOL, rng)
  const avatars = shuffled(AVATAR_POOL, rng)

  const out: OfflineBot[] = []
  for (let i = 0; i < OFFLINE_COHORT_SIZE; i++) {
    out.push({
      // Stable per-week ids; the rank-tracker uses id for tiebreaks
      // when two bots have the same weekly XP.
      id: `ol-${weekStart}-${String(i + 1).padStart(2, '0')}`,
      name: names[i % names.length],
      flag: flags[i % flags.length],
      avatar: avatars[i % avatars.length],
      weeklyXp: startingXp,
    })
  }
  return out
}

// ---------- State shape persisted by the mobile hook ----------

export interface OfflineLeagueState {
  /** ISO YYYY-MM-DD Monday this cohort belongs to. */
  weekStart: string
  cohort: OfflineBot[]
  /** Last YYYY-MM-DD we settled bot XP for. */
  lastSettledDate: string
  /**
   * Lifetime totalXp snapshot at last settle. The delta against the
   * current totalXp is what the bots split — using lifetime XP keeps
   * the math correct across weekly XP resets.
   */
  userTotalXpAtLastSettle: number
  /**
   * Weekly XP snapshot at last settle. Used purely for the rank-at-
   * week-end computation when we rotate cohorts; not part of the
   * settlement math.
   */
  userWeeklyXpAtLastSettle: number
  /**
   * Snapshot of the user's final rank from the previous cohort, used
   * to show the promote/demote banner after a week rollover. Null
   * when no prior week has been finalized yet.
   */
  prevWeekRank: number | null
}

/** Build a fresh state for week N from scratch. */
export function freshState(
  weekStart: string,
  today: string,
  userTotalXp = 0,
): OfflineLeagueState {
  return {
    weekStart,
    cohort: generateCohort(weekStart),
    lastSettledDate: today,
    userTotalXpAtLastSettle: userTotalXp,
    userWeeklyXpAtLastSettle: 0,
    prevWeekRank: null,
  }
}

/**
 * Compute the user's rank against `cohort` at `userWeeklyXp`.
 * 1-indexed. Ties broken by treating the user as below any bot
 * with equal XP — friendlier than the alternative since the user
 * just sees themselves "tied for N".
 */
export function rankUserIn(cohort: OfflineBot[], userWeeklyXp: number): number {
  let above = 0
  for (const bot of cohort) {
    if (bot.weeklyXp > userWeeklyXp) above++
  }
  return above + 1
}
