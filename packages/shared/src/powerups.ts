/**
 * Power-ups state + math. Two consumables for now:
 *
 *   - Double XP — flips XP earned to 2× for a fixed window (default 30
 *     minutes). Activatable once per local-day.
 *   - Streak freeze — opt-in claim once per week, banked up to a small
 *     cap. Auto-consumed when the user misses exactly one day so the
 *     streak survives the gap.
 *
 * State persists client-side (AsyncStorage on mobile, localStorage on
 * web). The math is pure — same input, same output — so the same
 * helpers can drive both clients and a future server reconciliation.
 */

export const DOUBLE_XP_DURATION_MS = 30 * 60 * 1000 // 30 minutes
export const MAX_STREAK_FREEZES = 2

export interface PowerupsState {
  /** Unix ms when the active Double XP window ends. Null when off. */
  doubleXpActiveUntil: number | null
  /**
   * YYYY-MM-DD of the local day Double XP was last activated. We use
   * this — not doubleXpActiveUntil — to enforce the once-per-day cap,
   * since the window length might be tunable later.
   */
  doubleXpLastActivatedDate: string | null
  /** Current banked freezes (0..MAX_STREAK_FREEZES). */
  streakFreezeCount: number
  /**
   * YYYY-MM-DD Monday of the week the user last claimed a freeze.
   * Empty / null until they claim the first one.
   */
  streakFreezeLastClaimedWeek: string | null
}

export const POWERUPS_DEFAULT: PowerupsState = {
  doubleXpActiveUntil: null,
  doubleXpLastActivatedDate: null,
  streakFreezeCount: 0,
  streakFreezeLastClaimedWeek: null,
}

// ---------- Double XP ----------

export function isDoubleXpActive(state: PowerupsState, nowMs: number): boolean {
  return state.doubleXpActiveUntil !== null && nowMs < state.doubleXpActiveUntil
}

/** 2 while the window is active, otherwise 1. Hand-roll wins in tests. */
export function xpMultiplier(state: PowerupsState, nowMs: number): number {
  return isDoubleXpActive(state, nowMs) ? 2 : 1
}

/**
 * Can the user start a fresh Double XP window now?
 *
 *   - No, if already active (they'd lose remaining time)
 *   - No, if already activated *today* (once-per-day rule)
 *   - Yes otherwise
 */
export function canActivateDoubleXp(state: PowerupsState, nowMs: number, today: string): boolean {
  if (isDoubleXpActive(state, nowMs)) return false
  return state.doubleXpLastActivatedDate !== today
}

export function activateDoubleXp(
  state: PowerupsState,
  nowMs: number,
  today: string,
  durationMs: number = DOUBLE_XP_DURATION_MS,
): PowerupsState {
  if (!canActivateDoubleXp(state, nowMs, today)) return state
  return {
    ...state,
    doubleXpActiveUntil: nowMs + durationMs,
    doubleXpLastActivatedDate: today,
  }
}

/** Milliseconds left in the active window, or 0 when not active. */
export function doubleXpMsRemaining(state: PowerupsState, nowMs: number): number {
  if (!isDoubleXpActive(state, nowMs)) return 0
  return Math.max(0, (state.doubleXpActiveUntil ?? 0) - nowMs)
}

// ---------- Streak Freeze ----------

export function canClaimStreakFreeze(
  state: PowerupsState,
  currentWeekStart: string,
): boolean {
  if (state.streakFreezeCount >= MAX_STREAK_FREEZES) return false
  return state.streakFreezeLastClaimedWeek !== currentWeekStart
}

export function claimStreakFreeze(
  state: PowerupsState,
  currentWeekStart: string,
): PowerupsState {
  if (!canClaimStreakFreeze(state, currentWeekStart)) return state
  return {
    ...state,
    streakFreezeCount: state.streakFreezeCount + 1,
    streakFreezeLastClaimedWeek: currentWeekStart,
  }
}

/**
 * Consume one freeze. No-op when the bank is empty so callers don't
 * have to gate-check first.
 */
export function consumeStreakFreeze(state: PowerupsState): PowerupsState {
  if (state.streakFreezeCount <= 0) return state
  return { ...state, streakFreezeCount: state.streakFreezeCount - 1 }
}

/**
 * Decide whether the next lesson completion should consume a freeze
 * to save the streak. True only when the user missed exactly one day —
 * lastActiveDate is two days before `today`. Bigger gaps mean the
 * streak is gone regardless; smaller gaps don't need a freeze.
 */
export function shouldUseStreakFreeze(
  state: PowerupsState,
  lastActiveDate: string | null,
  today: string,
): boolean {
  if (state.streakFreezeCount <= 0) return false
  if (!lastActiveDate) return false
  if (lastActiveDate === today) return false
  // Pretend last active was two days ago by checking dayBefore(yesterday)
  // — i.e., exactly one missed day in between.
  return lastActiveDate === addDaysYMD(today, -2)
}

/** Add `delta` days to a YYYY-MM-DD string in local time. */
export function addDaysYMD(dateYMD: string, delta: number): string {
  const [y, m, d] = dateYMD.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
