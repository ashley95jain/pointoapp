import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Card } from '../components/Card';
import { colors, radii } from '../theme/colors';
import { useAppState } from '../state/AppState';
import {
  REFERRAL_INSTALL_REWARD,
  REFERRAL_INVITE_REWARD,
  buildSharePayload,
} from '../services/referral';

export function ReferralScreen() {
  const {
    referralCode,
    referralUrl,
    lastReferralRedemption,
    acknowledgeReferralRedemption,
  } = useAppState();
  const [busy, setBusy] = useState(false);

  // Acknowledge the celebration after the first paint so it doesn't persist
  // across tab switches.
  useEffect(() => {
    if (!lastReferralRedemption) return;
    Alert.alert(
      'Referral applied!',
      `+${lastReferralRedemption.pointsCredited} pt added to your wallet.`,
      [{ text: 'Great', onPress: acknowledgeReferralRedemption }],
    );
  }, [lastReferralRedemption, acknowledgeReferralRedemption]);

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const payload = buildSharePayload(referralCode, referralUrl);
      await Share.share({
        title: payload.title,
        message: payload.message,
        url: payload.url,
      });
    } catch (err) {
      if (__DEV__) console.warn('[pointo] share failed', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.cardTitle}>Your referral link</Text>
          <Text style={styles.body}>Share this invitation with friends in Japan.</Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{referralCode}</Text>
          </View>
          <Text style={styles.url}>{referralUrl}</Text>

          <Pressable
            onPress={handleShare}
            disabled={busy}
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.shareButtonPressed,
              busy && styles.shareButtonDisabled,
            ]}
          >
            <Text style={styles.shareLabel}>
              {busy ? 'Opening share sheet…' : 'Share invite'}
            </Text>
          </Pressable>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Reward breakdown</Text>
          <RewardLine
            title="Install bonus"
            detail="When a friend installs through your link"
            value={`+${REFERRAL_INSTALL_REWARD} pt`}
          />
          <RewardLine
            title="Share bonus"
            detail="Earned each time you send an invitation"
            value={`+${REFERRAL_INVITE_REWARD} pt`}
          />
          <RewardLine
            title="Ongoing share"
            detail="5% of every point your friend earns"
            value="5%"
          />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>How it works</Text>
          <Text style={styles.body}>
            1. Tap “Share invite” and pick LINE, Messages, or any other app.{'\n'}
            2. Your friend opens the link and installs Pointo.{'\n'}
            3. Both of you receive bonus points on first launch.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardLine({
  title,
  detail,
  value,
}: {
  title: string;
  detail: string;
  value: string;
}) {
  return (
    <View style={styles.rewardRow}>
      <View style={styles.rewardText}>
        <Text style={styles.rewardTitle}>{title}</Text>
        <Text style={styles.rewardDetail}>{detail}</Text>
      </View>
      <Text style={styles.rewardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  body: {
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: colors.background,
    borderRadius: radii.chip,
    padding: 12,
    marginBottom: 8,
  },
  code: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  url: {
    color: colors.brandLight,
    fontWeight: '600',
    marginBottom: 14,
  },
  shareButton: {
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  shareButtonPressed: { opacity: 0.85 },
  shareButtonDisabled: { backgroundColor: colors.textTertiary },
  shareLabel: {
    color: colors.textOnBrand,
    fontWeight: '700',
    fontSize: 15,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rewardText: {
    flex: 1,
    paddingRight: 12,
  },
  rewardTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  rewardDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rewardValue: {
    color: colors.brand,
    fontWeight: '800',
  },
});
