import React from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { colors, radii } from '../theme/colors';
import { useAppState } from '../state/AppState';

export function NotificationsCard() {
  const {
    notificationsPermission,
    pushToken,
    notificationPrefs,
    enableNotifications,
    setNotificationPref,
  } = useAppState();

  if (Platform.OS === 'web' || notificationsPermission === 'unsupported') {
    return null;
  }

  if (notificationsPermission !== 'granted') {
    return (
      <Card>
        <Text style={styles.title}>Stay on streak</Text>
        <Text style={styles.body}>
          Get a gentle nudge at 6pm if you still have steps left to bank, and an
          alert whenever points land in your wallet. You can change this any
          time.
        </Text>
        <PrimaryButton
          label={notificationsPermission === 'denied' ? 'Open Settings to allow' : 'Enable notifications'}
          onPress={() => void enableNotifications()}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.title}>Notifications</Text>

      <ToggleRow
        label="Evening walk reminder"
        sub="Daily at 6:00 PM"
        value={notificationPrefs.walkEveningReminder}
        onChange={(v) => void setNotificationPref('walkEveningReminder', v)}
      />
      <ToggleRow
        label="Morning streak nudge"
        sub="Daily at 9:00 AM"
        value={notificationPrefs.streakMorningReminder}
        onChange={(v) => void setNotificationPref('streakMorningReminder', v)}
      />
      <ToggleRow
        label="Reward alerts"
        sub="Milestone credits and redemption confirmations"
        value={notificationPrefs.rewardAlerts}
        onChange={(v) => void setNotificationPref('rewardAlerts', v)}
      />

      {__DEV__ && pushToken ? (
        <Pressable
          onPress={() => {}}
          style={styles.tokenRow}
        >
          <Text style={styles.tokenLabel}>Expo push token (dev only)</Text>
          <Text style={styles.tokenValue} numberOfLines={1} selectable>
            {pushToken}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  tokenRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.chip,
    padding: 10,
    marginTop: 12,
  },
  tokenLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  tokenValue: {
    color: colors.textPrimary,
    fontFamily: 'Menlo',
    fontSize: 11,
  },
});
