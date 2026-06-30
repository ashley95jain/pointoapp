import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Card } from './Card';

type Props = {
  title: string;
  description: string;
  comingSoon: string[];
};

/**
 * Shared layout for the screens whose feature lives in later phases of the
 * build plan (Walk, Wallet). Keeps the navigation refactor visually complete
 * without pretending features exist that don't.
 */
export function PlaceholderScreen({ title, description, comingSoon }: Props) {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.subheading}>Coming soon</Text>
        {comingSoon.map((item, index) => (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  card: {
    gap: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  subheading: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  bullet: {
    color: colors.brand,
    fontWeight: '700',
  },
  bulletText: {
    color: colors.textSecondary,
    flex: 1,
  },
});
