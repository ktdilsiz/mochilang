/**
 * Type-only shapes for the per-user state slices.
 *
 * The actual hooks (useProgress, useProfile) live per-app because they
 * use platform-specific storage (localStorage on web, AsyncStorage on
 * React Native). The types live here so screens that *consume* the
 * state can be rendered from either platform without re-declaring them.
 */

export interface LessonResult {
  /** Lowest mistake count across all completions. */
  bestMistakes: number
  /** Number of times this lesson has been finished. */
  completions: number
  /** Last completion timestamp in ms. */
  lastAt: number
}

export interface ProgressState {
  totalXp: number
  /** Day count of consecutive activity ending today (or yesterday). */
  streak: number
  /** Local-day key (YYYY-MM-DD) of the last day with activity. */
  lastActiveDate: string | null
  /** Lesson id → best result. */
  results: Record<string, LessonResult>
  /** XP earned during the current league week (resets each Monday). */
  weeklyXp: number
  /** Monday (YYYY-MM-DD) the current weeklyXp counter belongs to. */
  weekStart: string | null
}

export interface ProfileState {
  /** Display name; null until first-launch setup completes. */
  name: string | null
  avatarId: string
  /** Current league tier index into LEAGUE_TIERS. */
  leagueTier: number
  /** Monday key of the user's currently-running league week. */
  leagueWeekStart: string | null
  lastWeekRank: number | null
  lastWeekChange: 'promoted' | 'demoted' | 'held' | null
}

export const PROGRESS_DEFAULT: ProgressState = {
  totalXp: 0,
  streak: 0,
  lastActiveDate: null,
  results: {},
  weeklyXp: 0,
  weekStart: null,
}

export const PROFILE_DEFAULT: ProfileState = {
  name: null,
  avatarId: 'mochi-main',
  leagueTier: 0,
  leagueWeekStart: null,
  lastWeekRank: null,
  lastWeekChange: null,
}
