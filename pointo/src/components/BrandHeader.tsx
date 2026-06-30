import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, radii } from '../theme/colors';
import { Card } from './Card';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function BrandHeader({
  eyebrow = '日本向けポイントアプリ',
  title,
  subtitle,
}: Props) {
  return (
    <Card variant="brand" style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: radii.card + 4,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: colors.textOnBrand,
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#DCEEFF',
    fontSize: 15,
    lineHeight: 22,
  },
});
