const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_IN_CHALLENGE = 30;

function utcMidnight(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Which challenge day (1-based, clamped to the 30-day window) a calendar date falls on. */
export function dayIndexForDate(startedAt: Date, on: Date = new Date()): number {
  const diff = Math.floor((utcMidnight(on) - utcMidnight(startedAt)) / DAY_MS);
  return Math.min(DAYS_IN_CHALLENGE, Math.max(1, diff + 1));
}

/**
 * Every day whose calendar date has already passed (today's day index or
 * earlier) with no logged entry. Doesn't flag days that just haven't come
 * up yet — only ones that were actually skipped.
 */
export function missedDays(startedAt: Date, loggedDays: Set<number>, on: Date = new Date()): number[] {
  const today = dayIndexForDate(startedAt, on);
  const missed: number[] = [];
  for (let day = 1; day <= today; day++) {
    if (!loggedDays.has(day)) missed.push(day);
  }
  return missed;
}

/** Consecutive logged days ending today or yesterday (today's not due to break a streak yet). */
export function currentStreak(startedAt: Date, loggedDays: Set<number>, on: Date = new Date()): number {
  const today = dayIndexForDate(startedAt, on);
  let streak = 0;
  for (let day = today; day >= 1; day--) {
    if (loggedDays.has(day)) {
      streak++;
    } else if (day === today) {
      continue; // today not logged yet doesn't break the streak
    } else {
      break;
    }
  }
  return streak;
}
