import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { Mission } from '../data/missions';

type Props = {
  mission: Mission;
  onPress: () => void;
};

export function MissionRow({ mission, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={mission.completed}
      style={[styles.row, mission.completed && styles.rowCompleted]}
    >
      <View style={styles.details}>
        <Text style={styles.title}>{mission.title}</Text>
        <Text style={styles.description}>{mission.description}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeValue}>+{mission.points}</Text>
        <Text style={styles.badgeStatus}>
          {mission.completed ? 'Claimed' : 'Claim'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowCompleted: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  details: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  badge: {
    alignItems: 'flex-end',
  },
  badgeValue: {
    color: colors.brand,
    fontWeight: '800',
    fontSize: 15,
  },
  badgeStatus: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
