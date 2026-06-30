import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandHeader } from '../components/BrandHeader';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radii } from '../theme/colors';
import { useAppState } from '../state/AppState';

export function LoginScreen() {
  const { name: storedName, phone: storedPhone, isLoading, login } = useAppState();
  const [name, setName] = useState(storedName);
  const [phone, setPhone] = useState(storedPhone);

  const handleLogin = async () => {
    const result = await login({ name, phone });
    if (!result.ok) {
      Alert.alert('Login needed', result.reason);
      return;
    }
    Alert.alert(
      'Welcome to Pointo',
      `Hello ${name.split(' ')[0]}! Your points dashboard is ready.`,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <BrandHeader
            title="Pointo"
            subtitle="Sign in, share a referral link, and earn rewards for installs, walks, and daily missions."
          />

          <Card>
            <Text style={styles.cardTitle}>Login</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="090-0000-0000"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textTertiary}
            />

            <PrimaryButton
              label={isLoading ? 'Connecting...' : 'Continue to Pointo'}
              onPress={handleLogin}
              disabled={isLoading}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
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
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8E6F6',
    borderRadius: radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: colors.textPrimary,
  },
});
