/**
 * Catalog of rewards a user can redeem points for. Costs are deliberately
 * skewed to feel attainable from typical missions + a week of walking
 * (~400 pt/day) so the first redemption happens early.
 */

export type RewardCategory = 'cash' | 'gift' | 'coupon';

export type RewardId = string;

export type Reward = {
  id: RewardId;
  title: string;
  brand: string;        // short brand badge: "PP", "AM", "SB", ...
  subtitle: string;
  description: string;
  cost: number;
  category: RewardCategory;
  popular?: boolean;
};

export const initialRewards: Reward[] = [
  {
    id: 'paypay-500',
    title: 'PayPay \u00a5500',
    brand: 'PP',
    subtitle: 'Cash credit to your PayPay balance',
    description:
      'Redeem 500 points for a \u00a5500 PayPay top-up. The voucher arrives via in-app code; redeem it in your PayPay wallet within 30 days.',
    cost: 500,
    category: 'cash',
    popular: true,
  },
  {
    id: 'paypay-1000',
    title: 'PayPay \u00a51,000',
    brand: 'PP',
    subtitle: 'Cash credit to your PayPay balance',
    description:
      'Top up your PayPay wallet with \u00a51,000. Redeem the voucher inside the PayPay app within 30 days of issue.',
    cost: 1000,
    category: 'cash',
  },
  {
    id: 'line-pay-1000',
    title: 'LINE Pay \u00a51,000',
    brand: 'LP',
    subtitle: 'Cash credit to your LINE Pay wallet',
    description: 'Get \u00a51,000 LINE Pay credit, redeemable in the LINE app.',
    cost: 1000,
    category: 'cash',
  },
  {
    id: 'amazon-500',
    title: 'Amazon \u00a5500',
    brand: 'AM',
    subtitle: 'Amazon.co.jp gift code',
    description:
      'Redeem points for a \u00a5500 Amazon.co.jp gift code. Apply it to your account from the Redeem a Gift Card page.',
    cost: 500,
    category: 'gift',
    popular: true,
  },
  {
    id: 'starbucks-500',
    title: 'Starbucks \u00a5500',
    brand: 'SB',
    subtitle: 'Starbucks Japan eGift',
    description:
      'A \u00a5500 Starbucks eGift, redeemable at any Starbucks Japan store with the Starbucks Japan app.',
    cost: 550,
    category: 'gift',
  },
  {
    id: 'seven-100',
    title: '7-Eleven \u00a5100',
    brand: '7E',
    subtitle: 'Konbini coupon',
    description: '\u00a5100 off any purchase at 7-Eleven Japan.',
    cost: 110,
    category: 'coupon',
  },
  {
    id: 'familymart-100',
    title: 'FamilyMart \u00a5100',
    brand: 'FM',
    subtitle: 'Konbini coupon',
    description: '\u00a5100 off any purchase at FamilyMart.',
    cost: 110,
    category: 'coupon',
  },
  {
    id: 'lawson-100',
    title: 'Lawson \u00a5100',
    brand: 'LW',
    subtitle: 'Konbini coupon',
    description: '\u00a5100 off any purchase at Lawson.',
    cost: 110,
    category: 'coupon',
  },
];

export function rewardById(id: RewardId): Reward | undefined {
  return initialRewards.find((r) => r.id === id);
}
