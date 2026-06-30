/**
 * Run with: `npx tsx scripts/walk-smoke.ts`
 *
 * Exercises the pure helpers in src/services/steps.ts. The Pedometer
 * itself isn't testable from Node, but the milestone logic and day key
 * formatting are — and those are the parts most likely to misbehave
 * silently in production.
 */
import {
  WALK_MILESTONES,
  localDayKey,
  newlyCrossedMilestones,
  caloriesFromSteps,
  distanceFromSteps,
} from '../src/services/walkHelpers';

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failures++;
  }
}

console.log('localDayKey');
const k = localDayKey(new Date(2026, 5, 30, 14, 23, 45));
check('formats YYYY-MM-DD', k === '2026-06-30', `got ${k}`);

console.log('\nnewlyCrossedMilestones');
check(
  'empty when below first milestone',
  newlyCrossedMilestones(1000, new Set()).length === 0,
);
check(
  'returns 3k at exactly 3000',
  newlyCrossedMilestones(3000, new Set())[0]?.steps === 3000,
);
check(
  'returns first three when at 8000',
  newlyCrossedMilestones(8000, new Set()).map((m) => m.steps).join(',') ===
    '3000,5000,8000',
);
check(
  'returns all four at 10500',
  newlyCrossedMilestones(10500, new Set()).length === 4,
);
check(
  'excludes already-credited milestones',
  newlyCrossedMilestones(10500, new Set([3000, 5000]))
    .map((m) => m.steps)
    .join(',') === '8000,10000',
);
check(
  'returns nothing when steps unchanged after credit',
  newlyCrossedMilestones(5000, new Set([3000, 5000])).length === 0,
);

console.log('\nWALK_MILESTONES total reward');
const totalReward = WALK_MILESTONES.reduce((a, m) => a + m.reward, 0);
check('sum is 390', totalReward === 390, `got ${totalReward}`);

console.log('\nUnit conversions');
check('distance for 0 steps is 0', distanceFromSteps(0) === 0);
check(
  'distance for 10k steps ~ 7.8 km',
  Math.abs(distanceFromSteps(10000) - 7800) < 1,
);
check('calories for 0 steps is 0', caloriesFromSteps(0) === 0);
check(
  'calories for 10k steps ~ 400',
  Math.abs(caloriesFromSteps(10000) - 400) < 1,
);

console.log('\n' + (failures === 0 ? 'All checks passed.' : `${failures} failures.`));
process.exit(failures === 0 ? 0 : 1);
