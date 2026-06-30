import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Card } from '../components/Card';
import { PointsHeader } from '../components/PointsHeader';
import { PlaceholderScreen } from '../components/PlaceholderScreen';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';

export function WalletScreen() {
  const { points, missions, completedCount } = useAppState();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <PointsHeader
          points={points}
          completedCount={completedCount}
          totalMissions={missions.length}
        />

        <Card style={styles.card}>
          <Text style={styles.subheading}>Wallet</Text>
          <Text style={styles.body}>
            Spend the points you earn on Japan-focused rewards — gift cards,
            e-money credit, mobile carrier points, and charitable donations.
          </Text>
        </Card>

        <PlaceholderScreen
          title="Reward catalogue"
          description="The redemption catalogue and transaction history land in Phase 3.1 and 3.2 of the build plan."
          comingSoon={[
            'Amazon Japan, Starbucks Japan, 7-Eleven gift codes',
            'PayPay, Rakuten Points, dPoint top-ups',
            'Charitable donation to UNICEF',
            'Chronological transaction history with reason tags',
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
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    gap: 8,
  },
  subheading: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
