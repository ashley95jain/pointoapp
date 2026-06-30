import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandHeader } from '../components/BrandHeader';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radii } from '../theme/colors';
import { useAppState } from '../state/AppState';

export function LoginScreen() {
  const { authStep, requestCode, verifyCode, cancelCodeEntry } = useAppState();

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
            subtitle="Sign in to earn points for installs, referrals, and walking — built for users in Japan."
          />

          {authStep.kind === 'awaiting-code' ? (
            <VerifyCard
              phone={authStep.phone}
              demoCode={authStep.demoCode}
              onSubmit={verifyCode}
              onBack={cancelCodeEntry}
            />
          ) : (
            <PhoneCard onSubmit={requestCode} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — phone number
// ---------------------------------------------------------------------------

function PhoneCard({
  onSubmit,
}: {
  onSubmit: (phone: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
}) {
  const [phone, setPhone] = useState('080-1234-5678');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    const result = await onSubmit(phone);
    setBusy(false);
    if (!result.ok) setError(result.reason);
  };

  return (
    <Card>
      <Text style={styles.cardTitle}>Sign in with phone</Text>
      <Text style={styles.cardBody}>
        We will send a 6-digit verification code by SMS. Standard rates may apply.
      </Text>

      <Text style={styles.inputLabel}>Phone number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="090-0000-0000"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        placeholderTextColor={colors.textTertiary}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label={busy ? 'Sending…' : 'Send verification code'}
        onPress={handleSubmit}
        disabled={busy || phone.trim().length === 0}
      />

      <View style={styles.helperRow}>
        <Text style={styles.helper}>• Supports 070 / 080 / 090 numbers and the +81 international form.</Text>
        <Text style={styles.helper}>• Phone number is the only identifier — no password to remember.</Text>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — verification code + display name
// ---------------------------------------------------------------------------

function VerifyCard({
  phone,
  demoCode,
  onSubmit,
  onBack,
}: {
  phone: string;
  demoCode?: string;
  onSubmit: (
    code: string,
    displayName: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('Aiko');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    const result = await onSubmit(code, name);
    setBusy(false);
    if (!result.ok) setError(result.reason);
  };

  return (
    <Card>
      <Text style={styles.cardTitle}>Enter your code</Text>
      <Text style={styles.cardBody}>
        We sent a 6-digit code to <Text style={styles.phoneInline}>{phone}</Text>. It is valid for 5 minutes.
      </Text>

      <Text style={styles.inputLabel}>Nickname</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Aiko"
        autoCapitalize="words"
        autoCorrect={false}
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={styles.inputLabel}>Verification code</Text>
      <TextInput
        style={[styles.input, styles.codeInput]}
        value={code}
        onChangeText={(next) => setCode(next.replace(/\D/g, ''))}
        placeholder="------"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
        placeholderTextColor={colors.textTertiary}
      />

      {demoCode ? (
        <Text style={styles.demoCode}>
          Demo code: {demoCode}  (or use 000000)
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label={busy ? 'Verifying…' : 'Log in to Pointo'}
        onPress={handleSubmit}
        disabled={busy || code.length < 6}
      />

      <Pressable onPress={onBack} style={styles.backRow}>
        <Text style={styles.backLabel}>Change phone number</Text>
      </Pressable>
    </Card>
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
    marginBottom: 6,
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  phoneInline: {
    color: colors.textPrimary,
    fontWeight: '700',
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
  codeInput: {
    fontSize: 18,
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },
  demoCode: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  error: {
    color: '#D14343',
    fontSize: 13,
    marginBottom: 8,
  },
  helperRow: {
    marginTop: 14,
    gap: 4,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  backRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backLabel: {
    color: colors.brandLight,
    fontWeight: '600',
  },
});
