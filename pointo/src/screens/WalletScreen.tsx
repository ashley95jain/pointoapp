import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Card } from '../components/Card';
import { PointsHeader } from '../components/PointsHeader';
import { colors, radii, spacing } from '../theme/colors';
import { useAppState } from '../state/AppState';
import type { Redemption } from '../data/redemptions';
import type {
  PointTransaction,
  TransactionKind,
} from '../data/transactions';
import type { Reward, RewardCategory } from '../data/rewards';

type Tab = 'catalog' | 'history' | 'log';

export function WalletScreen() {
  const {
    points,
    missions,
    completedCount,
    rewards,
    transactions,
    redemptions,
    lastRedemption,
    redeemReward,
    acknowledgeRedemption,
    ledgerSyncEnabled,
    ledgerSyncStatus,
    outboxSize,
    flushLedger,
    pullLedger,
  } = useAppState();

  const [tab, setTab] = useState<Tab>('catalog');

  useEffect(() => {
    if (!lastRedemption) return;
    Alert.alert(
      'Redemption confirmed',
      `${lastRedemption.rewardTitle} is yours.\nVoucher: ${lastRedemption.voucherCode}`,
      [{ text: 'Done', onPress: acknowledgeRedemption }],
    );
  }, [lastRedemption, acknowledgeRedemption]);

  const handleRedeem = (reward: Reward) => {
    if (points < reward.cost) {
      Alert.alert(
        'Not enough points',
        `You need ${(reward.cost - points).toLocaleString()} more points to redeem ${reward.title}.`,
      );
      return;
    }
    Alert.alert(
      `Redeem ${reward.title}?`,
      `${reward.description}\n\nCost: ${reward.cost.toLocaleString()} points`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          style: 'destructive',
          onPress: () => {
            const result = redeemReward(reward.id);
            if (!result.ok) Alert.alert('Could not redeem', result.reason);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <PointsHeader
          points={points}
          completedCount={completedCount}
          totalMissions={missions.length}
        />

        <View style={styles.tabBar}>
          {([
            { id: 'catalog', label: 'Rewards' },
            { id: 'history', label: `History${redemptions.length ? ` \u00B7 ${redemptions.length}` : ''}` },
            { id: 'log', label: 'Activity' },
          ] as const).map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, tab === t.id && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'catalog' ? (
          <CatalogTab rewards={rewards} balance={points} onRedeem={handleRedeem} />
        ) : null}
        {tab === 'history' ? <HistoryTab redemptions={redemptions} /> : null}
        {tab === 'log' ? <ActivityTab transactions={transactions} /> : null}

        {ledgerSyncEnabled ? (
          <SyncCard
            status={ledgerSyncStatus}
            outboxSize={outboxSize}
            onFlush={() => void flushLedger()}
            onPull={async () => {
              const r = await pullLedger();
              if (!r.ok) Alert.alert('Sync failed', r.reason);
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SyncCard({
  status,
  outboxSize,
  onFlush,
  onPull,
}: {
  status: { kind: string; reason?: string; at?: number };
  outboxSize: number;
  onFlush: () => void;
  onPull: () => void;
}) {
  let label = 'Synced with server';
  if (status.kind === 'syncing') label = 'Syncing\u2026';
  else if (status.kind === 'error') label = `Sync failed: ${status.reason ?? 'unknown'}`;
  else if (status.kind === 'idle' && outboxSize === 0) label = 'Ready to sync';

  return (
    <Card>
      <Text style={styles.cardTitle}>Server-side ledger</Text>
      <Text style={styles.cardBody}>{label}</Text>
      {outboxSize > 0 ? (
        <Text style={styles.outboxLine}>
          {outboxSize} transaction{outboxSize === 1 ? '' : 's'} pending upload.
        </Text>
      ) : null}
      <View style={styles.syncRow}>
        <Pressable onPress={onFlush} style={({ pressed }) => [styles.syncButton, pressed && styles.syncButtonPressed]}>
          <Text style={styles.syncLabel}>Push outbox</Text>
        </Pressable>
        <Pressable onPress={onPull} style={({ pressed }) => [styles.syncButton, pressed && styles.syncButtonPressed]}>
          <Text style={styles.syncLabel}>Pull from server</Text>
        </Pressable>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function CatalogTab({
  rewards,
  balance,
  onRedeem,
}: {
  rewards: ReadonlyArray<Reward>;
  balance: number;
  onRedeem: (r: Reward) => void;
}) {
  const sorted = useMemo(() => {
    return [...rewards].sort((a, b) => {
      if (!!a.popular !== !!b.popular) return a.popular ? -1 : 1;
      return a.cost - b.cost;
    });
  }, [rewards]);

  return (
    <Card>
      <Text style={styles.cardTitle}>Redeem rewards</Text>
      <Text style={styles.cardBody}>
        All rewards are issued instantly as in-app voucher codes you can copy
        into the destination wallet.
      </Text>
      {sorted.map((reward) => (
        <RewardTile
          key={reward.id}
          reward={reward}
          affordable={balance >= reward.cost}
          shortfall={balance < reward.cost ? reward.cost - balance : 0}
          onPress={() => onRedeem(reward)}
        />
      ))}
    </Card>
  );
}

function HistoryTab({ redemptions }: { redemptions: ReadonlyArray<Redemption> }) {
  if (redemptions.length === 0) {
    return (
      <Card>
        <Text style={styles.cardTitle}>No redemptions yet</Text>
        <Text style={styles.cardBody}>
          Once you redeem a reward, your voucher codes will live here.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.cardTitle}>Redemption history</Text>
      {redemptions.map((r) => (
        <View key={r.id} style={styles.historyRow}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>{r.rewardTitle}</Text>
            <Text style={styles.historyCost}>-{r.pointsSpent.toLocaleString()} pt</Text>
          </View>
          <Text style={styles.voucherCode} selectable>
            {r.voucherCode}
          </Text>
          <Text style={styles.historyMeta}>
            {`${formatRelative(r.redeemedAt)} \u00B7 ${r.status}`}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function ActivityTab({
  transactions,
}: {
  transactions: ReadonlyArray<PointTransaction>;
}) {
  if (transactions.length === 0) {
    return (
      <Card>
        <Text style={styles.cardTitle}>No activity yet</Text>
        <Text style={styles.cardBody}>
          As you complete missions, hit step milestones, redeem rewards, and
          invite friends, every point movement shows up here.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.cardTitle}>Activity log</Text>
      {transactions.map((tx) => (
        <View key={tx.id} style={styles.txRow}>
          <View style={[styles.txKindBadge, kindBadgeStyle(tx.kind)]}>
            <Text style={styles.txKindLabel}>{kindShort(tx.kind)}</Text>
          </View>
          <View style={styles.txMiddle}>
            <Text style={styles.txLabel} numberOfLines={1}>
              {tx.label}
            </Text>
            <Text style={styles.txMeta}>{formatRelative(tx.at)}</Text>
          </View>
          <Text
            style={[
              styles.txDelta,
              tx.delta >= 0 ? styles.txDeltaPositive : styles.txDeltaNegative,
            ]}
          >
            {tx.delta >= 0 ? '+' : ''}
            {tx.delta.toLocaleString()}
          </Text>
        </View>
      ))}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Reward tile
// ---------------------------------------------------------------------------

function RewardTile({
  reward,
  affordable,
  shortfall,
  onPress,
}: {
  reward: Reward;
  affordable: boolean;
  shortfall: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rewardTile, pressed && styles.rewardTilePressed]}
    >
      <View style={[styles.brandBadge, categoryBadgeStyle(reward.category)]}>
        <Text style={styles.brandBadgeLabel}>{reward.brand}</Text>
      </View>
      <View style={styles.rewardTileBody}>
        <View style={styles.rewardTileHeader}>
          <Text style={styles.rewardTitle}>{reward.title}</Text>
          {reward.popular ? (
            <View style={styles.popularPill}>
              <Text style={styles.popularLabel}>Popular</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rewardSubtitle} numberOfLines={1}>
          {reward.subtitle}
        </Text>
      </View>
      <View style={styles.rewardTileRight}>
        <Text style={[styles.rewardCost, !affordable && styles.rewardCostMuted]}>
          {reward.cost.toLocaleString()}
        </Text>
        <Text style={styles.rewardCostUnit}>pt</Text>
        {shortfall > 0 ? (
          <Text style={styles.rewardShortfall}>
            -{shortfall.toLocaleString()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelative(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function kindShort(kind: TransactionKind): string {
  switch (kind) {
    case 'initial-balance':
      return 'INIT';
    case 'mission':
      return 'MIS';
    case 'walk-milestone':
      return 'WLK';
    case 'referral-install':
      return 'INV';
    case 'referral-invite':
      return 'INV';
    case 'redemption':
      return 'RDM';
  }
}

function kindBadgeStyle(kind: TransactionKind) {
  switch (kind) {
    case 'redemption':
      return { backgroundColor: '#FFE7E7', borderColor: '#FFC4C4' };
    case 'walk-milestone':
      return { backgroundColor: '#E1F4FF', borderColor: '#B8DEF6' };
    case 'mission':
      return { backgroundColor: colors.successBg, borderColor: colors.success };
    case 'referral-install':
    case 'referral-invite':
      return { backgroundColor: '#FFF4D6', borderColor: '#F5D984' };
    default:
      return { backgroundColor: colors.surfaceMuted, borderColor: colors.border };
  }
}

function categoryBadgeStyle(cat: RewardCategory) {
  switch (cat) {
    case 'cash':
      return { backgroundColor: colors.brand };
    case 'gift':
      return { backgroundColor: '#0F7A47' };
    case 'coupon':
      return { backgroundColor: '#8E5BD6' };
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingBottom: 40, gap: 16 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  tabActive: { backgroundColor: colors.brand },
  tabLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  tabLabelActive: { color: colors.textOnBrand },

  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  rewardTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  rewardTilePressed: { opacity: 0.7 },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeLabel: {
    color: colors.textOnBrand,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rewardTileBody: { flex: 1 },
  rewardTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rewardTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  rewardSubtitle: { color: colors.textSecondary, fontSize: 12 },
  popularPill: {
    backgroundColor: '#FFF4D6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularLabel: { color: '#8A6900', fontSize: 10, fontWeight: '800' },

  rewardTileRight: { alignItems: 'flex-end', minWidth: 64 },
  rewardCost: {
    color: colors.brand,
    fontWeight: '800',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  rewardCostMuted: { color: colors.textTertiary },
  rewardCostUnit: { color: colors.textSecondary, fontSize: 11, marginTop: -2 },
  rewardShortfall: {
    color: '#C04A4A',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  historyRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyTitle: { color: colors.textPrimary, fontWeight: '700', flex: 1 },
  historyCost: { color: '#B23A3A', fontWeight: '800', fontVariant: ['tabular-nums'] },
  voucherCode: {
    fontFamily: 'Menlo',
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    letterSpacing: 1,
  },
  historyMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 6 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  txKindBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 46,
    alignItems: 'center',
  },
  txKindLabel: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  txMiddle: { flex: 1 },
  txLabel: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  txMeta: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  txDelta: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  txDeltaPositive: { color: '#1E7A2E' },
  txDeltaNegative: { color: '#B23A3A' },

  outboxLine: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  syncRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  syncButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.brand,
    alignItems: 'center',
  },
  syncButtonPressed: { opacity: 0.7 },
  syncLabel: { color: colors.brand, fontWeight: '700', fontSize: 13 },
});
