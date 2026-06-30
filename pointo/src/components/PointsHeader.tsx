import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { Card } from './Card';

type Props = {
  points: number;
  completedCount: number;
  totalMissions: number;
};

export function PointsHeader({ points, completedCount, totalMissions }: Props) {
  return (
    <Card variant="brandDark">
      <Text style={styles.label}>Available points</Text>
      <Text style={styles.value}>{points}</Text>
      <Text style={styles.subtext}>
        {completedCount} of {totalMissions} missions completed
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#9BC5E2',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.textOnBrand,
    fontSize: 40,
    fontWeight: '800',
    marginTop: 8,
  },
  subtext: {
    color: '#DCEEFF',
    marginTop: 6,
  },
});
