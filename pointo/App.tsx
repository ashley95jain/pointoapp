import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

type Mission = {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
};

const initialMissions: Mission[] = [
  {
    id: 'install',
    title: 'Install through a referral link',
    description: 'Get 300 points for installing Pointo from a trusted referral.',
    points: 300,
    completed: false,
  },
  {
    id: 'walk',
    title: 'Walk and earn',
    description: 'Complete a 10,000-step challenge and unlock 500 points.',
    points: 500,
    completed: false,
  },
  {
    id: 'invite',
    title: 'Invite a friend in Japan',
    description: 'Share your referral code and earn another 250 points.',
    points: 250,
    completed: false,
  },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState('Aiko');
  const [phone, setPhone] = useState('080-1234-5678');
  const [points, setPoints] = useState(120);
  const [missions, setMissions] = useState(initialMissions);

  const referralCode = useMemo(() => 'POINTO-JP-7H2K', []);
  const completedCount = missions.filter((mission) => mission.completed).length;

  const handleLogin = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Login needed', 'Please enter your name and phone number to continue.');
      return;
    }

    setIsLoggedIn(true);
    Alert.alert('Welcome to Pointo', `Hello ${name.split(' ')[0]}! Your points dashboard is ready.`);
  };

  const handleMissionPress = (missionId: string) => {
    const selectedMission = missions.find((mission) => mission.id === missionId);
    if (!selectedMission || selectedMission.completed) {
      return;
    }

    setMissions((current) =>
      current.map((mission) => (mission.id === missionId ? { ...mission, completed: true } : mission)),
    );
    setPoints((current) => current + selectedMission.points);
    Alert.alert('Mission claimed', `${selectedMission.points} points added to your wallet.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>日本向けポイントアプリ</Text>
          <Text style={styles.title}>Pointo</Text>
          <Text style={styles.subtitle}>
            Sign in, share a referral link, and earn rewards for installs, walks, and daily missions.
          </Text>
        </View>

        {!isLoggedIn ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Login</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#8DA1B8"
            />

            <Text style={styles.inputLabel}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="090-0000-0000"
              keyboardType="phone-pad"
              placeholderTextColor="#8DA1B8"
            />

            <Pressable style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Continue to Pointo</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.pointsCard}>
              <Text style={styles.pointsLabel}>Available points</Text>
              <Text style={styles.pointsValue}>{points}</Text>
              <Text style={styles.pointsSubtext}>{completedCount} of {missions.length} missions completed</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your referral link</Text>
              <Text style={styles.referralText}>Share this invitation with friends in Japan.</Text>
              <View style={styles.referralBox}>
                <Text style={styles.referralCode}>{referralCode}</Text>
              </View>
              <Text style={styles.linkText}>https://pointo.app/join/{referralCode}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Earn more points</Text>
              {missions.map((mission) => (
                <Pressable
                  key={mission.id}
                  onPress={() => handleMissionPress(mission.id)}
                  style={[styles.missionRow, mission.completed && styles.missionCompleted]}>
                  <View style={styles.missionDetails}>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    <Text style={styles.missionDescription}>{mission.description}</Text>
                  </View>
                  <View style={styles.missionBadge}>
                    <Text style={styles.missionBadgeText}>+{mission.points}</Text>
                    <Text style={styles.missionBadgeSmall}>{mission.completed ? 'Claimed' : 'Claim'}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  headerCard: {
    backgroundColor: '#0F4C81',
    borderRadius: 24,
    padding: 24,
  },
  eyebrow: {
    color: '#A3D8FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#DCEEFF',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0F4C81',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    color: '#12324A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputLabel: {
    color: '#516273',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8E6F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: '#12324A',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#0F4C81',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pointsCard: {
    backgroundColor: '#12324A',
    borderRadius: 22,
    padding: 20,
  },
  pointsLabel: {
    color: '#9BC5E2',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    marginTop: 8,
  },
  pointsSubtext: {
    color: '#DCEEFF',
    marginTop: 6,
  },
  referralText: {
    color: '#516273',
    marginBottom: 10,
  },
  referralBox: {
    backgroundColor: '#F4F8FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  referralCode: {
    color: '#0F4C81',
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: {
    color: '#2D6EA8',
    fontWeight: '600',
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E4EEFA',
  },
  missionCompleted: {
    backgroundColor: '#EAF8ED',
    borderColor: '#80C787',
  },
  missionDetails: {
    flex: 1,
    marginRight: 10,
  },
  missionTitle: {
    color: '#12324A',
    fontWeight: '700',
    marginBottom: 4,
  },
  missionDescription: {
    color: '#5B6D7A',
    fontSize: 12,
    lineHeight: 18,
  },
  missionBadge: {
    alignItems: 'flex-end',
  },
  missionBadgeText: {
    color: '#0F4C81',
    fontWeight: '800',
    fontSize: 15,
  },
  missionBadgeSmall: {
    color: '#5B6D7A',
    fontSize: 12,
    marginTop: 2,
  },
});
