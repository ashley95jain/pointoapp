/**
 * Pure helpers for walk-to-earn — no React Native / Expo imports so they
 * can be unit-tested with plain Node.
 */

const STRIDE_METERS = 0.78;
const CALORIES_PER_STEP = 0.04;

export function distanceFromSteps(steps: number): number {
  return steps * STRIDE_METERS;
}

export function caloriesFromSteps(steps: number): number {
  return steps * CALORIES_PER_STEP;
}

export const WALK_MILESTONES: ReadonlyArray<{ steps: number; reward: number }> = [
  { steps: 3000, reward: 30 },
  { steps: 5000, reward: 60 },
  { steps: 8000, reward: 100 },
  { steps: 10000, reward: 200 },
];

export const WALK_DAILY_GOAL = WALK_MILESTONES[WALK_MILESTONES.length - 1].steps;
export const WALK_MISSION_COMPLETION_STEPS = 10_000;

/** Returns the milestones that the given step count newly crosses. */
export function newlyCrossedMilestones(
  todaySteps: number,
  alreadyCredited: ReadonlySet<number>,
): { steps: number; reward: number }[] {
  return WALK_MILESTONES.filter(
    (m) => todaySteps >= m.steps && !alreadyCredited.has(m.steps),
  );
}

/** YYYY-MM-DD in the user's local timezone. Used as the daily reset key. */
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
