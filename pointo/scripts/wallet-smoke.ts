/**
 * Run with: `npx tsx scripts/wallet-smoke.ts`
 *
 * Pure-Node assertions for the Phase 2.4 wallet helpers. Covers:
 *   - The reward catalog is well-formed and stable.
 *   - generateVoucherCode produces unique, well-shaped codes.
 *   - The transaction-log cap behaves correctly.
 *   - Redemption arithmetic balances against the transaction sum.
 */
import { initialRewards, rewardById } from '../src/data/rewards';
import {
  generateVoucherCode,
  nextRedemptionId,
  type Redemption,
} from '../src/data/redemptions';
import {
  MAX_TRANSACTION_LOG,
  nextTransactionId,
  type PointTransaction,
} from '../src/data/transactions';

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  PASS  ${label}`);
  else {
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
    failures++;
  }
}

console.log('Reward catalog');
check('non-empty', initialRewards.length > 0);
check('all costs are positive', initialRewards.every((r) => r.cost > 0));
check('all ids unique', new Set(initialRewards.map((r) => r.id)).size === initialRewards.length);
check('all brands are 2-3 chars', initialRewards.every((r) => r.brand.length >= 2 && r.brand.length <= 3));
check('rewardById returns matching entry', rewardById('paypay-500')?.cost === 500);
check('rewardById returns undefined for unknown', rewardById('nope') === undefined);

console.log('\nIds');
const ids = new Set<string>();
for (let i = 0; i < 200; i++) {
  ids.add(nextTransactionId());
  ids.add(nextRedemptionId());
}
check('tx + redemption ids are unique across 400 generations', ids.size === 400);

console.log('\nVoucher codes');
const codes = new Set<string>();
for (let i = 0; i < 100; i++) codes.add(generateVoucherCode());
check('100 voucher codes are all unique', codes.size === 100);
check(
  'voucher code matches POINTO-XXXX-XXXX shape',
  [...codes].every((c) => /^POINTO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)),
);

console.log('\nTransaction-log cap simulation');
// Simulate the addTransaction reducer: prepend, then slice.
let log: PointTransaction[] = [];
for (let i = 0; i < MAX_TRANSACTION_LOG + 50; i++) {
  log = [
    {
      id: nextTransactionId(),
      kind: 'mission',
      delta: 10,
      label: `tx-${i}`,
      at: Date.now(),
    },
    ...log,
  ];
  if (log.length > MAX_TRANSACTION_LOG) log = log.slice(0, MAX_TRANSACTION_LOG);
}
check('log capped to MAX_TRANSACTION_LOG', log.length === MAX_TRANSACTION_LOG);
check(
  'most recent entry is at the head',
  log[0].label === `tx-${MAX_TRANSACTION_LOG + 49}`,
);

console.log('\nRedemption arithmetic balances against tx log');
const startingBalance = 1500;
const reward = initialRewards.find((r) => r.id === 'paypay-500')!;
const redemption: Redemption = {
  id: nextRedemptionId(),
  rewardId: reward.id,
  rewardTitle: reward.title,
  rewardCategory: reward.category,
  pointsSpent: reward.cost,
  voucherCode: generateVoucherCode(),
  redeemedAt: Date.now(),
  status: 'fulfilled',
};
const txs: PointTransaction[] = [
  {
    id: nextTransactionId(),
    kind: 'redemption',
    delta: -redemption.pointsSpent,
    label: `Redeemed ${reward.title}`,
    at: Date.now(),
  },
];
const finalBalance = startingBalance + txs.reduce((a, t) => a + t.delta, 0);
check(
  'final balance = start - reward cost',
  finalBalance === startingBalance - reward.cost,
  `expected ${startingBalance - reward.cost}, got ${finalBalance}`,
);

console.log('\n' + (failures === 0 ? 'All wallet checks passed.' : `${failures} failures.`));
process.exit(failures === 0 ? 0 : 1);
