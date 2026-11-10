import type { DayStats } from '../../storage/schema';

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayBefore(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function upsertDay(
  prev: DayStats[],
  delta: { wordTapsDelta?: number; secondsDelta?: number }
): DayStats[] {
  const today = todayKey();
  const idx = prev.findIndex((d) => d.date === today);
  const tapsDelta = delta.wordTapsDelta ?? 0;
  const secondsDelta = delta.secondsDelta ?? 0;
  if (idx === -1) {
    return [
      ...prev,
      { date: today, wordTaps: tapsDelta, secondsRead: secondsDelta },
    ];
  }
  const next = [...prev];
  next[idx] = {
    ...next[idx],
    wordTaps: next[idx].wordTaps + tapsDelta,
    secondsRead: next[idx].secondsRead + secondsDelta,
  };
  return next;
}

/** Count consecutive days of activity ending today (or yesterday). */
export function computeStreak(stats: DayStats[]): number {
  if (stats.length === 0) return 0;
  const dates = new Set(stats.map((d) => d.date));
  const today = todayKey();
  // If today has no activity yet, the streak still holds if yesterday did.
  let cursor = dates.has(today) ? today : dayBefore(today, 1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = dayBefore(cursor, 1);
  }
  return streak;
}

export function statsForDate(
  stats: DayStats[],
  date: string
): DayStats | null {
  return stats.find((d) => d.date === date) ?? null;
}

export function statsLastNDays(
  stats: DayStats[],
  n: number
): DayStats[] {
  const today = todayKey();
  const out: DayStats[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = dayBefore(today, i);
    const found = stats.find((d) => d.date === key);
    out.push(found ?? { date: key, wordTaps: 0, secondsRead: 0 });
  }
  return out;
}
