/**
 * Simplified SM-2 spaced-repetition scheduling, shared between mochiread and
 * mochilang. Pure functions over a small `Card` shape — no storage, no React,
 * no platform deps. Apps wrap their own persistence around it.
 */

export type Card = {
  /** SM-2 ease factor; starts at 2.5, floored at 1.3. */
  ease: number;
  /** Current interval in days; 0 = never reviewed. */
  intervalDays: number;
  /** Timestamp (ms) when the card is next due for review. */
  dueAt: number;
  /** Cumulative number of times the user said they remembered the card. */
  remembered: number;
  /** Cumulative number of times they didn't. */
  forgotten: number;
  /** Last time the card was reviewed; undefined if never. */
  lastReviewedAt?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function newCard(now = Date.now()): Card {
  return {
    ease: 2.5,
    intervalDays: 0,
    dueAt: now,
    remembered: 0,
    forgotten: 0,
  };
}

/**
 * Apply a simplified SM-2 update for a binary remembered/forgot grade.
 *
 * Forgot: reset interval to 1 day, knock the ease factor down by 0.2
 *   (floored at 1.3). Card returns tomorrow.
 * Remembered: 1st time → 1 day; 2nd → 6 days; thereafter previous interval ×
 *   ease. Ease nudges up by 0.05 per success, capped at 3.0.
 */
export function applySm2(card: Card, remembered: boolean, now = Date.now()): Card {
  if (!remembered) {
    return {
      ...card,
      forgotten: card.forgotten + 1,
      ease: Math.max(1.3, card.ease - 0.2),
      intervalDays: 1,
      dueAt: now + DAY_MS,
      lastReviewedAt: now,
    };
  }

  let nextInterval: number;
  if (card.intervalDays === 0) nextInterval = 1;
  else if (card.intervalDays < 6) nextInterval = 6;
  else nextInterval = Math.round(card.intervalDays * card.ease);

  const nextEase = Math.min(3.0, card.ease + 0.05);

  return {
    ...card,
    remembered: card.remembered + 1,
    ease: nextEase,
    intervalDays: nextInterval,
    dueAt: now + nextInterval * DAY_MS,
    lastReviewedAt: now,
  };
}

/** Filter a list of cards down to those due now. */
export function dueCards<T extends { dueAt: number }>(
  cards: T[],
  now = Date.now()
): T[] {
  return cards.filter((c) => c.dueAt <= now);
}

/** Sort a deck so longest-overdue cards come first. */
export function sortByOverdue<T extends { dueAt: number }>(
  cards: T[]
): T[] {
  return [...cards].sort((a, b) => a.dueAt - b.dueAt);
}
