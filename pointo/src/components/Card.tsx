import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { colors, radii } from '../theme/colors';

type Props = ViewProps & {
  variant?: 'surface' | 'brandDark' | 'brand';
  style?: ViewStyle | ViewStyle[];
};

export function Card({ variant = 'surface', style, children, ...rest }: Props) {
  return (
    <View
      style={[styles.base, styles[variant], style as ViewStyle]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    padding: 18,
  },
  surface: {
    backgroundColor: colors.surface,
    shadowColor: colors.brand,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  brand: {
    backgroundColor: colors.brand,
  },
  brandDark: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    padding: 20,
  },
});
