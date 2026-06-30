import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii } from '../theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: colors.textTertiary,
  },
  label: {
    color: colors.textOnBrand,
    fontSize: 15,
    fontWeight: '700',
  },
});
