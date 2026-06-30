import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PlaceholderScreen } from '../components/PlaceholderScreen';
import { colors } from '../theme/colors';

export function WalkScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <PlaceholderScreen
          title="Walk and earn"
          description="Track your daily steps and unlock point milestones. Real pedometer integration ships in Phase 2.3 of the build plan."
          comingSoon={[
            'Live step count powered by expo-sensors Pedometer',
            'Milestone rewards at 3k / 5k / 8k / 10k steps',
            'Weekly streak bonuses',
            'Health Connect / HealthKit corroboration',
          ]}
        />
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
    paddingBottom: 40,
  },
});
