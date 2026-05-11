/**
 * Per-mochi visit schedule.
 *
 * Each mochi has a stable, deterministic daily visit window — derived
 * from their index so a reinstall lands on the same schedule. Window
 * length picks from a small set so visits feel varied: a quick 30-min
 * lunch stop vs. a four-hour evening hangout. With 119 mochies and an
 * average window of ~126min, ~10 mochies are typically visiting at any
 * moment over the course of a day.
 *
 * Visits are pure functions of (index, currentTime). Invitations layer
 * on top in the useVillageVisits hook.
 */

export const VISIT_DURATION_OPTIONS = [30, 60, 120, 180, 240] as const

export interface VisitWindow {
  /** Hour the mochi typically arrives (0–23). */
  hour: number
  /** Minute within the hour (0–59). */
  minute: number
  /** How long the visit lasts. */
  durationMinutes: number
}

/**
 * Deterministic schedule for a mochi index. Uses a multiplicative hash
 * + LCG steps so the three fields are independently spread across
 * their ranges and don't correlate with one another visually.
 */
export function scheduleFor(mochiIndex: number): VisitWindow {
  let h = ((mochiIndex + 1) * 2654435761) >>> 0
  h ^= h >>> 13
  const hour = (h >>> 0) % 24
  h = (h * 1103515245 + 12345) >>> 0
  const minute = (h >>> 0) % 60
  h = (h * 1103515245 + 12345) >>> 0
  const durationMinutes =
    VISIT_DURATION_OPTIONS[(h >>> 0) % VISIT_DURATION_OPTIONS.length]
  return { hour, minute, durationMinutes }
}

/**
 * Today's visit window expressed as JS dates anchored to `now`'s
 * calendar day. End may extend past midnight.
 */
export function visitWindowOn(mochiIndex: number, day: Date): { start: Date; end: Date } {
  const { hour, minute, durationMinutes } = scheduleFor(mochiIndex)
  const start = new Date(day)
  start.setHours(hour, minute, 0, 0)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return { start, end }
}

/**
 * True if the mochi is in their visit window right now. Handles wrap:
 * if a window starts late (say 22:30) and runs 4h, "now" at 01:00 is
 * still inside the *previous* day's window.
 */
export function isVisitingNow(mochiIndex: number, now: Date): boolean {
  const today = visitWindowOn(mochiIndex, now)
  if (now >= today.start && now < today.end) return true
  // Check yesterday's window in case it wrapped past midnight.
  const yesterday = visitWindowOn(
    mochiIndex,
    new Date(now.getTime() - 24 * 3600 * 1000),
  )
  return now >= yesterday.start && now < yesterday.end
}

/**
 * Next time this mochi is scheduled to arrive after `now`, as a
 * Date. If they're currently visiting, returns their *current*
 * window's start (so callers can show "visiting now since HH:MM").
 */
export function nextArrival(mochiIndex: number, now: Date): Date {
  const today = visitWindowOn(mochiIndex, now)
  if (now < today.start) return today.start
  if (now < today.end) return today.start
  const tomorrow = visitWindowOn(
    mochiIndex,
    new Date(now.getTime() + 24 * 3600 * 1000),
  )
  return tomorrow.start
}

/** "09:30 for 2h" style label used by the Atlas list. */
export function formatVisitWindow(mochiIndex: number): string {
  const { hour, minute, durationMinutes } = scheduleFor(mochiIndex)
  const hh = hour.toString().padStart(2, '0')
  const mm = minute.toString().padStart(2, '0')
  const h = Math.floor(durationMinutes / 60)
  const m = durationMinutes % 60
  const dur = h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
  return `${hh}:${mm} for ${dur}`
}
