import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';

/**
 * Renders a splash while the persisted state is loading on app launch.
 * Prevents the login screen from flashing for a frame on resumed sessions.
 */
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const { isHydrated } = useAppState();

  if (isHydrated) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Pointo</Text>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  brand: {
    color: colors.brandDark,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
