/**
 * League tier definitions + promotion/demotion thresholds.
 *
 * Each weekly cohort holds 31 spots (the user + 30 bots). At week's end:
 *   - rank 1..3  → promote one tier (capped at the top tier)
 *   - rank 26..31 → demote one tier (capped at Bronze)
 *   - everyone else stays put
 */

export interface LeagueTier {
  id: string
  name: string
  emoji: string
  /** Color used for the tier badge background. */
  color: string
  /** Color used for the tier badge edge. */
  edge: string
}

export const LEAGUE_TIERS: LeagueTier[] = [
  { id: 'bronze', name: 'Bronze', emoji: '🥉', color: '#f5d3a5', edge: '#b07a3a' },
  { id: 'silver', name: 'Silver', emoji: '🥈', color: '#dfe6ee', edge: '#7d8b9b' },
  { id: 'gold', name: 'Gold', emoji: '🥇', color: '#ffe78a', edge: '#c69a14' },
  { id: 'sapphire', name: 'Sapphire', emoji: '🔷', color: '#bcd6ff', edge: '#3b6dd6' },
  { id: 'ruby', name: 'Ruby', emoji: '🔴', color: '#ffb8b8', edge: '#c43d3d' },
  { id: 'diamond', name: 'Diamond', emoji: '💎', color: '#bff2ee', edge: '#2eb6a6' },
]

export const PROMOTE_RANK = 3 // top 3 promote
export const DEMOTE_RANK = 26 // ranks 26..31 demote (out of 31)
export const COHORT_SIZE = 31

export function tierAt(index: number): LeagueTier {
  const i = Math.max(0, Math.min(LEAGUE_TIERS.length - 1, index))
  return LEAGUE_TIERS[i]
}

/**
 * Apply promote/demote based on the user's previous-week rank (1-indexed).
 * Returns the new tier index.
 */
export function applyTierChange(currentTier: number, rank: number): number {
  if (rank <= PROMOTE_RANK) {
    return Math.min(LEAGUE_TIERS.length - 1, currentTier + 1)
  }
  if (rank >= DEMOTE_RANK) {
    return Math.max(0, currentTier - 1)
  }
  return currentTier
}
