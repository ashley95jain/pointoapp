import React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandHeader } from '../components/BrandHeader';
import { Card } from '../components/Card';
import { MissionRow } from '../components/MissionRow';
import { PointsHeader } from '../components/PointsHeader';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';

export function HomeScreen() {
  const { name, points, missions, completedCount, claimMission, logout } = useAppState();

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
          title={`Hi, ${name.split(' ')[0]}`}
          subtitle="Earn rewards every day by completing missions, walking, and inviting friends."
        />

        <PointsHeader
          points={points}
          completedCount={completedCount}
          totalMissions={missions.length}
        />

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
});
