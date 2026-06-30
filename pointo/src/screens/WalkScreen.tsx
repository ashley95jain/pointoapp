import React, { useEffect } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radii } from '../theme/colors';
import { useAppState } from '../state/AppState';
import {
  WALK_DAILY_GOAL,
  WALK_MILESTONES,
  caloriesFromSteps,
  distanceFromSteps,
} from '../services/steps';

export function WalkScreen() {
  const {
    todaySteps,
    stepsAuthorization,
    creditedWalkMilestones,
    lastWalkMilestone,
    acknowledgeWalkMilestone,
    startStepTracking,
    injectDemoSteps,
    resetDemoSteps,
  } = useAppState();

  useEffect(() => {
    if (!lastWalkMilestone) return;
    Alert.alert(
      'Milestone reached!',
      `+${lastWalkMilestone.pointsCredited} pt added — you crossed ${lastWalkMilestone.steps.toLocaleString()} steps.`,
      [{ text: 'Nice', onPress: acknowledgeWalkMilestone }],
    );
  }, [lastWalkMilestone, acknowledgeWalkMilestone]);

  const progress = Math.min(1, todaySteps / WALK_DAILY_GOAL);
  const credited = new Set(creditedWalkMilestones);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card variant="brandDark" style={styles.hero}>
          <Text style={styles.heroLabel}>Today's steps</Text>
          <Text style={styles.heroValue}>{todaySteps.toLocaleString()}</Text>
          <Text style={styles.heroGoal}>
            Goal: {WALK_DAILY_GOAL.toLocaleString()} steps
          </Text>
          <ProgressBar progress={progress} />
          <View style={styles.statRow}>
            <Stat
              label="Distance"
              value={`${(distanceFromSteps(todaySteps) / 1000).toFixed(2)} km`}
            />
            <Stat
              label="Calories"
              value={`${Math.round(caloriesFromSteps(todaySteps))} kcal`}
            />
            <Stat
              label="Active"
              value={`${Math.floor(todaySteps / 110)} min`}
            />
          </View>
        </Card>

        {stepsAuthorization !== 'granted' ? (
          <PermissionCard
            authorization={stepsAuthorization}
            onEnable={() => void startStepTracking()}
          />
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Step milestones</Text>
          {WALK_MILESTONES.map((milestone) => (
            <MilestoneRow
              key={milestone.steps}
              steps={milestone.steps}
              reward={milestone.reward}
              current={todaySteps}
              claimed={credited.has(milestone.steps)}
            />
          ))}
          {Platform.OS === 'android' &&
          stepsAuthorization === 'granted' &&
          todaySteps < 100 ? (
            <Text style={styles.androidHint}>
              On Android, Pointo reads steps via Health Connect / Google Fit
              and may take a few minutes to sync after the first launch.
            </Text>
          ) : null}
        </Card>

        {__DEV__ ? (
          <Card>
            <Text style={styles.cardTitle}>Demo controls</Text>
            <Text style={styles.cardBody}>
              Manually nudge today's step count to exercise milestones in the
              iOS Simulator (which doesn't report real steps).
            </Text>
            <View style={styles.demoRow}>
              <Pressable
                onPress={() => injectDemoSteps(1500)}
                style={({ pressed }) => [styles.demoButton, pressed && styles.demoButtonPressed]}
              >
                <Text style={styles.demoLabel}>+1,500 steps</Text>
              </Pressable>
              <Pressable
                onPress={resetDemoSteps}
                style={({ pressed }) => [styles.demoButton, pressed && styles.demoButtonPressed]}
              >
                <Text style={styles.demoLabel}>Reset</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PermissionCard({
  authorization,
  onEnable,
}: {
  authorization: 'unknown' | 'denied' | 'unavailable';
  onEnable: () => void;
}) {
  if (authorization === 'unavailable') {
    return (
      <Card>
        <Text style={styles.cardTitle}>Step tracking unavailable</Text>
        <Text style={styles.cardBody}>
          This device cannot report step counts. On Android, install Google
          Fit or Health Connect to enable Pointo's walk-to-earn missions.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.cardTitle}>Enable motion tracking</Text>
      <Text style={styles.cardBody}>
        Pointo needs permission to read your step count so we can award
        walk-to-earn points. Your motion data never leaves the device.
      </Text>
      <PrimaryButton
        label={authorization === 'denied' ? 'Open Settings to allow' : 'Allow & start tracking'}
        onPress={onEnable}
      />
    </Card>
  );
}

function MilestoneRow({
  steps,
  reward,
  current,
  claimed,
}: {
  steps: number;
  reward: number;
  current: number;
  claimed: boolean;
}) {
  const progress = Math.min(1, current / steps);
  return (
    <View style={[styles.milestoneRow, claimed && styles.milestoneRowClaimed]}>
      <View style={styles.milestoneLeft}>
        <Text style={styles.milestoneTitle}>
          Reach {steps.toLocaleString()} steps
        </Text>
        <View style={styles.milestoneTrack}>
          <View
            style={[
              styles.milestoneFill,
              claimed && styles.milestoneFillClaimed,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
      </View>
      <View style={styles.milestoneRight}>
        <Text style={[styles.milestoneReward, claimed && styles.milestoneRewardClaimed]}>
          +{reward}
        </Text>
        <Text style={styles.milestoneStatus}>
          {claimed ? 'Claimed' : `${Math.min(current, steps).toLocaleString()} / ${steps.toLocaleString()}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  hero: { gap: 4 },
  heroLabel: {
    color: '#9BC5E2',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroValue: {
    color: colors.textOnBrand,
    fontSize: 48,
    fontWeight: '800',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  heroGoal: {
    color: '#DCEEFF',
    marginBottom: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A3D8FF',
    borderRadius: 6,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textOnBrand,
    fontWeight: '800',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: '#DCEEFF',
    fontSize: 11,
    marginTop: 2,
  },
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
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  milestoneRowClaimed: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  milestoneLeft: {
    flex: 1,
    marginRight: 10,
  },
  milestoneRight: {
    alignItems: 'flex-end',
  },
  milestoneTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 6,
  },
  milestoneTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  milestoneFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 4,
  },
  milestoneFillClaimed: {
    backgroundColor: colors.success,
  },
  milestoneReward: {
    color: colors.brand,
    fontWeight: '800',
    fontSize: 16,
  },
  milestoneRewardClaimed: {
    color: '#1E7A2E',
  },
  milestoneStatus: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.brand,
    alignItems: 'center',
  },
  demoButtonPressed: {
    opacity: 0.7,
  },
  demoLabel: {
    color: colors.brand,
    fontWeight: '700',
  },
  androidHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
});
