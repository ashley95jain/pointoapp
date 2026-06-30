import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Card } from '../components/Card';
import { colors, radii } from '../theme/colors';
import { useAppState } from '../state/AppState';

export function ReferralScreen() {
  const { referralCode, referralUrl } = useAppState();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.cardTitle}>Your referral link</Text>
          <Text style={styles.body}>Share this invitation with friends in Japan.</Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{referralCode}</Text>
          </View>
          <Text style={styles.url}>{referralUrl}</Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>How it works</Text>
          <Text style={styles.body}>
            1. Share your invite link.{'\n'}
            2. Your friend installs Pointo from the link.{'\n'}
            3. Both of you receive bonus points.
          </Text>
        </Card>
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
  body: {
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: colors.background,
    borderRadius: radii.chip,
    padding: 12,
    marginBottom: 8,
  },
  code: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '700',
  },
  url: {
    color: colors.brandLight,
    fontWeight: '600',
  },
});
