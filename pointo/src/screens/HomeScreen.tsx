import React from 'react';
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
import { BrandHeader } from '../components/BrandHeader';
import { Card } from '../components/Card';
import { MissionRow } from '../components/MissionRow';
import { NotificationsCard } from '../components/NotificationsCard';
import { PointsHeader } from '../components/PointsHeader';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';
import { WALK_DAILY_GOAL } from '../services/steps';

export function HomeScreen() {
  const {
    user,
    points,
    missions,
    completedCount,
    todaySteps,
    claimMission,
    logout,
  } = useAppState();
  const displayName = user?.displayName ?? 'Pointo会員';
  const walkProgress = Math.min(1, todaySteps / WALK_DAILY_GOAL);

  const handleMissionPress = (id: typeof missions[number]['id']) => {
    const claimed = claimMission(id);
    if (claimed) {
      Alert.alert('Mission claimed', `${claimed.points} points added to your wallet.`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <BrandHeader
          title={`Hi, ${displayName.split(' ')[0]}`}
          subtitle="Earn rewards every day by completing missions, walking, and inviting friends."
        />

        <PointsHeader
          points={points}
          completedCount={completedCount}
          totalMissions={missions.length}
        />

        <Card>
          <Text style={styles.cardTitle}>Today's walk</Text>
          <Text style={styles.walkValue}>
            {todaySteps.toLocaleString()}{' '}
            <Text style={styles.walkUnit}>
              / {WALK_DAILY_GOAL.toLocaleString()} steps
            </Text>
          </Text>
          <View style={styles.walkTrack}>
            <View
              style={[styles.walkFill, { width: `${Math.round(walkProgress * 100)}%` }]}
            />
          </View>
          <Text style={styles.walkHint}>
            {todaySteps >= WALK_DAILY_GOAL
              ? "Daily goal hit — nice work!"
              : 'Walk more to unlock milestone rewards in the Walk tab.'}
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Earn more points</Text>
          {missions.map((mission) => (
            <MissionRow
              key={mission.id}
              mission={mission}
              onPress={() => handleMissionPress(mission.id)}
            />
          ))}
        </Card>

        <NotificationsCard />

        <Pressable onPress={logout} style={styles.logoutPressable}>
          <Text style={styles.logoutLabel}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  logoutPressable: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutLabel: {
    color: colors.brandLight,
    fontWeight: '600',
  },
  walkValue: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  walkUnit: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  walkTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: 10,
  },
  walkFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 4,
  },
  walkHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 10,
  },
});
