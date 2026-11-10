/**
 * Offline / adaptive league.
 *
 * When no auth-backed server cohort is available, we generate 30 bots
 * locally and run them on their own schedules. Each bot has a fixed
 * archetype (hardcore / streaker / weekender / casual / comeback) that
 * drives a deterministic daily XP curve, plus a small response to your
 * own effort (top ranks get a slight bonus on your big days).
 *
 * Two pieces of state per bot:
 *
 *   - Static identity (name, flag, avatar, lifetimeXp, baseline streak)
 *     — generated once at cohort creation, seeded by weekStart.
 *   - weeklyXp — accumulates day by day as the hook settles.
 *
 * The cohort regenerates every Monday. Bots that didn't appear in the
 * previous cohort get a "new this week" flag so the screen can call
 * them out.
 *
 * Math summary:
 *
 *   bot.weeklyXp += dailyBotXp(bot, day)      // archetype-driven
 *   bot.weeklyXp += round(share(rank) * userDailyDelta * USER_INFLUENCE)
 *     where share(rank) = TOP_BOT_SHARE * DECAY_PER_RANK^(rank-1)
 *
 * The user-influenced component is small enough that bots don't outrun
 * you when you have a great day, but big enough that grinding still
 * pulls the cohort along.
 */

import { seededRng, ymd } from './dates'

export const TOP_BOT_SHARE = 0.8
export const DECAY_PER_RANK = 0.92
export const OFFLINE_COHORT_SIZE = 30 // bots only; user makes 31

/** Fraction of the old user-proxy reward the bots still get on top of archetype XP. */
export const USER_INFLUENCE = 0.2

/**
 * Cap on userDelta credited to "today's effort" so a long-absence
 * comeback doesn't dump a massive bonus into the cohort.
 */
export const MAX_USER_DELTA_CREDIT = 500

export type BotArchetype =
  | 'hardcore'
  | 'streaker'
  | 'weekender'
  | 'casual'
  | 'comeback'

export interface OfflineBot {
  id: string
  name: string
  avatar: string
  flag: string
  weeklyXp: number
  archetype: BotArchetype
  /** Lifetime XP shown in detail rows. Static for the week. */
  lifetimeXp: number
  /** Day streak shown next to the name. Static for the week. */
  streak: number
  /** True when this name wasn't in the previous cohort. */
  isNew?: boolean
}

// ---------- Math ----------

/** Reward share (of one day's userDelta) for a bot sitting at `rank`. */
export function botShareForRank(rank: number): number {
  if (rank < 1) return TOP_BOT_SHARE
  return TOP_BOT_SHARE * Math.pow(DECAY_PER_RANK, rank - 1)
}

function dayOfWeekLocal(dateYMD: string): number {
  // YYYY-MM-DD → 0=Sun..6=Sat in the local timezone.
  const [y, m, d] = dateYMD.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/**
 * One bot's XP earned on a specific calendar day. Deterministic per
 * (botId, date) so the same day always replays the same number — a
 * crash-restart mid-settle produces the same cohort it would have
 * without the crash.
 */
export function dailyBotXp(
  botId: string,
  archetype: BotArchetype,
  dateYMD: string,
): number {
  const rng = seededRng(`${botId}|${dateYMD}|daily`)
  const a = rng()
  const b = rng()
  switch (archetype) {
    case 'hardcore':
      if (a < 0.05) return 0 // rare rest day
      return Math.round(80 + b * 80) // 80–160
    case 'streaker':
      return Math.round(50 + b * 60) // 50–110, never 0
    case 'weekender': {
      const dow = dayOfWeekLocal(dateYMD)
      const isWeekend = dow === 0 || dow === 6
      if (isWeekend) return Math.round(280 + b * 170) // 280–450
      return Math.round(b * 25) // 0–25
    }
    case 'casual':
      if (a < 0.3) return 0 // 30% rest days
      return Math.round(b * 70) // 0–70
    case 'comeback':
      if (a < 0.2) return Math.round(280 + b * 200) // 280–480 burst day
      return 0
  }
}

/**
 * Find the most recent day the bot was active. Walks back up to
 * `maxBack` calendar days and returns 0 if today was active, 1 if
 * yesterday, etc., or null if nothing in range.
 */
export function lastActiveDaysAgo(
  botId: string,
  archetype: BotArchetype,
  today: string,
  maxBack = 7,
): number | null {
  for (let n = 0; n <= maxBack; n++) {
    const ymdN = addDays(today, -n)
    if (dailyBotXp(botId, archetype, ymdN) > 0) return n
  }
  return null
}

export function addDays(dateYMD: string, delta: number): string {
  const [y, m, d] = dateYMD.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return ymd(dt)
}

/**
 * Settle the cohort up to `today`. For each day after the last settle:
 *
 *   - every bot earns dailyBotXp() into its weeklyXp
 *
 * Then once, today only, every bot picks up a small rank-decay bonus
 * keyed off the user's totalXp delta since the last settle (capped).
 *
 * Returns the new cohort + the rank snapshot at "before" so the caller
 * can render rank-change arrows.
 */
export function settleThrough(
  cohort: OfflineBot[],
  lastSettledDate: string,
  today: string,
  userDelta: number,
): { cohort: OfflineBot[]; prevRanks: Record<string, number> } {
  // 1. Snapshot ranks before settling so we can produce arrows.
  const prevRanks = rankMap(cohort)

  // 2. Walk every day between lastSettledDate (exclusive) and today
  //    (inclusive) and apply archetype XP. This is what keeps bots
  //    moving even when the user takes a rest day.
  let next = cohort
  let cursor = lastSettledDate
  while (cursor !== today) {
    cursor = addDays(cursor, 1)
    next = next.map((bot) => ({
      ...bot,
      weeklyXp: bot.weeklyXp + dailyBotXp(bot.id, bot.archetype, cursor),
    }))
    if (cursor > today) break // safety against clock skew
  }

  // 3. One pass of user-influence on top of today's archetype XP.
  //    Sort by current weeklyXp so the bonus tracks current rank, not
  //    yesterday's. Cap the user delta so a long absence doesn't dump.
  const credited = Math.min(MAX_USER_DELTA_CREDIT, Math.max(0, Math.round(userDelta)))
  const sorted = [...next].sort(
    (a, b) => b.weeklyXp - a.weeklyXp || a.id.localeCompare(b.id),
  )
  const byId = new Map(
    sorted.map((bot, idx) => [
      bot.id,
      Math.round(USER_INFLUENCE * botShareForRank(idx + 1) * credited),
    ]),
  )
  next = next.map((bot) => ({
    ...bot,
    weeklyXp: bot.weeklyXp + (byId.get(bot.id) ?? 0),
  }))

  return { cohort: next, prevRanks }
}

/** Build a rank-by-id map from current cohort order. 1-indexed. */
export function rankMap(cohort: OfflineBot[]): Record<string, number> {
  const sorted = [...cohort].sort(
    (a, b) => b.weeklyXp - a.weeklyXp || a.id.localeCompare(b.id),
  )
  const out: Record<string, number> = {}
  sorted.forEach((bot, idx) => {
    out[bot.id] = idx + 1
  })
  return out
}

/**
 * Compute the user's rank against `cohort` at `userWeeklyXp`.
 * 1-indexed. Ties broken by treating the user as below any bot
 * with equal XP — friendlier since the user just sees "tied for N".
 */
export function rankUserIn(cohort: OfflineBot[], userWeeklyXp: number): number {
  let above = 0
  for (const bot of cohort) {
    if (bot.weeklyXp > userWeeklyXp) above++
  }
  return above + 1
}

// ---------- Pools ----------

/** Names paired with a culturally plausible flag — no more 🇲🇽 Mateusz. */
const NAME_FLAG_POOL: { name: string; flag: string }[] = [
  { name: 'Wei', flag: '🇨🇳' },
  { name: 'Aiko', flag: '🇯🇵' },
  { name: 'Marco', flag: '🇮🇹' },
  { name: 'Priya', flag: '🇮🇳' },
  { name: 'Liam', flag: '🇮🇪' },
  { name: 'Sofia', flag: '🇪🇸' },
  { name: 'Kenji', flag: '🇯🇵' },
  { name: 'Amara', flag: '🇳🇬' },
  { name: 'Mateo', flag: '🇲🇽' },
  { name: 'Yuki', flag: '🇯🇵' },
  { name: 'Hugo', flag: '🇫🇷' },
  { name: 'Nora', flag: '🇸🇪' },
  { name: 'Diego', flag: '🇨🇴' },
  { name: 'Lin', flag: '🇨🇳' },
  { name: 'Ravi', flag: '🇮🇳' },
  { name: 'Elena', flag: '🇷🇺' },
  { name: 'Tomás', flag: '🇧🇷' },
  { name: 'Mei', flag: '🇨🇳' },
  { name: 'Otto', flag: '🇩🇪' },
  { name: 'Anya', flag: '🇺🇦' },
  { name: 'Pablo', flag: '🇦🇷' },
  { name: 'Hana', flag: '🇰🇷' },
  { name: 'Finn', flag: '🇫🇮' },
  { name: 'Aria', flag: '🇺🇸' },
  { name: 'Niko', flag: '🇬🇷' },
  { name: 'Sora', flag: '🇯🇵' },
  { name: 'Iván', flag: '🇪🇸' },
  { name: 'Léa', flag: '🇫🇷' },
  { name: 'Saanvi', flag: '🇮🇳' },
  { name: 'Aleks', flag: '🇵🇱' },
  { name: 'Ines', flag: '🇵🇹' },
  { name: 'Asha', flag: '🇰🇪' },
  { name: 'Tariq', flag: '🇪🇬' },
  { name: 'Cleo', flag: '🇬🇧' },
  { name: 'Bruno', flag: '🇧🇷' },
  { name: 'Tara', flag: '🇮🇪' },
  { name: 'Yusuf', flag: '🇹🇷' },
  { name: 'Olga', flag: '🇷🇺' },
  { name: 'Hiro', flag: '🇯🇵' },
  { name: 'Camille', flag: '🇫🇷' },
  { name: 'Jonas', flag: '🇩🇪' },
  { name: 'Léna', flag: '🇫🇷' },
  { name: 'Mireia', flag: '🇪🇸' },
  { name: 'Tomek', flag: '🇵🇱' },
  { name: 'Naima', flag: '🇲🇦' },
  { name: 'Andrei', flag: '🇷🇴' },
  { name: 'Saskia', flag: '🇳🇱' },
  { name: 'Carlos', flag: '🇲🇽' },
  { name: 'Daria', flag: '🇷🇺' },
  { name: 'Felix', flag: '🇩🇪' },
  { name: 'Iliana', flag: '🇬🇷' },
  { name: 'Kazem', flag: '🇮🇷' },
  { name: 'Lula', flag: '🇧🇷' },
  { name: 'Magnus', flag: '🇸🇪' },
  { name: 'Nina', flag: '🇧🇷' },
  { name: 'Patel', flag: '🇮🇳' },
  { name: 'Rasmus', flag: '🇩🇰' },
  { name: 'Sarai', flag: '🇮🇱' },
  { name: 'Theo', flag: '🇬🇧' },
  { name: 'Uma', flag: '🇮🇳' },
  { name: 'Viktor', flag: '🇷🇺' },
  { name: 'Wren', flag: '🇺🇸' },
  { name: 'Xun', flag: '🇨🇳' },
  { name: 'Yara', flag: '🇧🇷' },
  { name: 'Zane', flag: '🇺🇸' },
  { name: 'Beatriz', flag: '🇵🇹' },
  { name: 'Dalia', flag: '🇮🇱' },
  { name: 'Eli', flag: '🇮🇱' },
  { name: 'Fátima', flag: '🇸🇦' },
  { name: 'Gunnar', flag: '🇳🇴' },
  { name: 'Hema', flag: '🇮🇳' },
  { name: 'Jules', flag: '🇫🇷' },
  { name: 'Karim', flag: '🇲🇦' },
  { name: 'Lola', flag: '🇪🇸' },
  { name: 'Maya', flag: '🇮🇱' },
  { name: 'Naomi', flag: '🇯🇵' },
  { name: 'Oren', flag: '🇮🇱' },
  { name: 'Penny', flag: '🇺🇸' },
  { name: 'Quincy', flag: '🇨🇦' },
  { name: 'Rita', flag: '🇧🇷' },
  { name: 'Sami', flag: '🇫🇮' },
  { name: 'Tess', flag: '🇮🇪' },
  { name: 'Vera', flag: '🇪🇪' },
  { name: 'Wendy', flag: '🇦🇺' },
  { name: 'Xochitl', flag: '🇲🇽' },
  { name: 'Yann', flag: '🇫🇷' },
  { name: 'Zara', flag: '🇵🇰' },
]

const AVATAR_POOL = [
  '🐯', '🦊', '🐼', '🦋', '🐶', '🐰', '🐉', '🦁', '🐺', '🐧',
  '🦔', '🦉', '🐲', '🐨', '🐘', '🦄', '🐢', '🐌', '🐗', '🐱',
  '🐹', '🐸', '🐙', '🐻', '🐮', '🦘', '🦥', '🦦', '🦝', '🦃',
  '🦜', '🦚', '🦅', '🦆',
] as const

/**
 * Distribution of archetypes inside a cohort. Numbers sum to
 * OFFLINE_COHORT_SIZE = 30: 3 hardcore + 6 streaker + 5 weekender +
 * 12 casual + 4 comeback.
 */
const ARCHETYPE_PROFILE: BotArchetype[] = [
  ...Array(3).fill('hardcore') as BotArchetype[],
  ...Array(6).fill('streaker') as BotArchetype[],
  ...Array(5).fill('weekender') as BotArchetype[],
  ...Array(12).fill('casual') as BotArchetype[],
  ...Array(4).fill('comeback') as BotArchetype[],
]

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Archetype-specific ranges for the static lifetime XP and streak shown
// next to a bot's name. Tuned so a "hardcore" player looks veteran and a
// "casual" looks newer. Both seeded per (botId, weekStart) so they stay
// stable for the week.
const LIFETIME_RANGE: Record<BotArchetype, [number, number]> = {
  hardcore: [30000, 80000],
  streaker: [20000, 60000],
  weekender: [10000, 40000],
  casual: [3000, 20000],
  comeback: [5000, 30000],
}

const STREAK_RANGE: Record<BotArchetype, [number, number]> = {
  hardcore: [30, 200],
  streaker: [50, 365],
  weekender: [0, 3], // weekday zero-XP days reset their streak
  casual: [0, 15],
  comeback: [0, 7],
}

function rngFor(seed: string): () => number {
  return seededRng(seed)
}

function randInRange(rng: () => number, [lo, hi]: [number, number]): number {
  return Math.round(lo + rng() * (hi - lo))
}

/**
 * Generate a fresh 30-bot cohort for a given weekStart. The result is
 * deterministic per weekStart so reinstalls land on the same names AND
 * the same archetype distribution.
 *
 * `isNew` is NOT set here — the caller decides whether to mark bots as
 * new (see `markNewBots`). At first-ever launch there's no prior week
 * to compare against, so we'd rather leave the flag unset than badge
 * the entire roster as "new".
 */
export function generateCohort(weekStart: string): OfflineBot[] {
  const rng = seededRng(`offline-league|${weekStart}`)
  const pool = shuffled(NAME_FLAG_POOL, rng)
  const avatars = shuffled(AVATAR_POOL, rng)
  const archetypes = shuffled(ARCHETYPE_PROFILE, rng)

  const out: OfflineBot[] = []
  for (let i = 0; i < OFFLINE_COHORT_SIZE; i++) {
    // Stable per-week id; the rank-tracker uses id for deterministic tiebreaks.
    const id = `ol-${weekStart}-${String(i + 1).padStart(2, '0')}`
    const entry = pool[i % pool.length]
    const arch = archetypes[i % archetypes.length]
    const detailRng = rngFor(`${id}|${weekStart}|detail`)
    out.push({
      id,
      name: entry.name,
      flag: entry.flag,
      avatar: avatars[i % avatars.length],
      archetype: arch,
      weeklyXp: 0,
      lifetimeXp: randInRange(detailRng, LIFETIME_RANGE[arch]),
      streak: randInRange(detailRng, STREAK_RANGE[arch]),
    })
  }
  return out
}

/**
 * Annotate bots with `isNew = true` when their name didn't appear in
 * `previousNames`. Call this only on week rollover — at first-ever
 * generation there's no meaningful "previous", so skip and leave the
 * flag unset.
 */
export function markNewBots(
  cohort: OfflineBot[],
  previousNames: string[],
): OfflineBot[] {
  const prev = new Set(previousNames)
  return cohort.map((b) => ({ ...b, isNew: !prev.has(b.name) }))
}

// ---------- State shape ----------

export interface OfflineLeagueState {
  /** ISO YYYY-MM-DD Monday this cohort belongs to. */
  weekStart: string
  cohort: OfflineBot[]
  /** Last YYYY-MM-DD we settled bot XP for. */
  lastSettledDate: string
  /** Lifetime totalXp snapshot at last settle. Drives the user-influence bonus. */
  userTotalXpAtLastSettle: number
  /** Weekly XP snapshot at last settle. Used only for the rank-at-rollover read. */
  userWeeklyXpAtLastSettle: number
  /** Rank-by-id captured BEFORE the most recent settle, for ↑/↓/— arrows. */
  prevRanks: Record<string, number>
  /** Snapshot of the user's final rank from the previous cohort, used for the banner. */
  prevWeekRank: number | null
  /** Bot names from the most recent cohort, for the "new this week" check. */
  recentNames: string[]
}

/**
 * Build a fresh state for week N from scratch. Used at first-ever
 * install (no prior cohort exists). `markNewBots` is intentionally
 * not called here — without a previous week to diff against, the
 * "new" badge has no meaning, and badging everyone gives a noisy UI.
 */
export function freshState(
  weekStart: string,
  today: string,
  userTotalXp = 0,
): OfflineLeagueState {
  const cohort = generateCohort(weekStart)
  return {
    weekStart,
    cohort,
    lastSettledDate: today,
    userTotalXpAtLastSettle: userTotalXp,
    userWeeklyXpAtLastSettle: 0,
    prevRanks: rankMap(cohort),
    prevWeekRank: null,
    recentNames: cohort.map((b) => b.name),
  }
}
