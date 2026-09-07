export type DayLog = { day: number; count: number };

export const BASE_TARGETS = [100,120,150,190,210,250,270,210,290,310,310,190,330,350,370,210,410,430,450,210,450,470,490,190,520,550,570,230,590,580];
export const GOAL = 10000;
export const DAYS = BASE_TARGETS.length;

/**
 * Days already logged keep their original target (history shouldn't move).
 * Everything after re-ramps across the remaining days so the plan still
 * lands on GOAL by day 30 — ahead of pace shrinks what's left, behind
 * pace grows it. Preserves the original ramp's shape, just rescaled.
 */
export function adaptiveTargets(logs: DayLog[], base: number[] = BASE_TARGETS): number[] {
  const latestDay = logs.length ? Math.max(...logs.map((l) => l.day)) : 0;
  if (latestDay <= 0 || latestDay >= base.length) return base.slice();
  const total = logs.reduce((sum, log) => sum + log.count, 0);
  const remainingGoal = Math.max(0, GOAL - total);
  const originalRemainingSum = base.slice(latestDay).reduce((sum, v) => sum + v, 0);
  const scale = originalRemainingSum > 0 ? remainingGoal / originalRemainingSum : 0;
  return base.map((t, i) => (i < latestDay ? t : Math.max(0, Math.round(t * scale))));
}
