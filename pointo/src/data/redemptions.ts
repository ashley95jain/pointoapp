/**
 * Redemptions store a voucher record per redeem action. In production the
 * voucher code would be issued by a backend after debiting points; here
 * we mint a deterministic-looking placeholder so the UI can show
 * something the user can copy.
 */

import type { RewardCategory, RewardId } from './rewards';

export type RedemptionStatus = 'pending' | 'fulfilled';

export type Redemption = {
  id: string;
  rewardId: RewardId;
  rewardTitle: string;
  rewardCategory: RewardCategory;
  pointsSpent: number;
  voucherCode: string;
  redeemedAt: number;
  status: RedemptionStatus;
};

export function generateVoucherCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `POINTO-${part()}-${part()}`;
}

export function nextRedemptionId(): string {
  return `rdm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
