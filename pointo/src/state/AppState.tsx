import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { type Mission, type MissionId } from '../data/missions';
import {
  claimMissionWithBackend,
  createDemoSnapshot,
  loginWithBackend,
  type AuthFormState,
  type BackendMode,
} from '../services/pointoBackend';

type AppStateValue = {
  profileId?: string;
  isLoggedIn: boolean;
  isLoading: boolean;
  name: string;
  phone: string;
  points: number;
  missions: Mission[];
  referralCode: string;
  referralUrl: string;
  backendMode: BackendMode;
  completedCount: number;
  claimingMissionId?: MissionId;
  error?: string;

  setName: (name: string) => void;
  setPhone: (phone: string) => void;
  login: (form: AuthFormState) => Promise<{ ok: true } | { ok: false; reason: string }>;
  logout: () => void;
  claimMission: (id: MissionId) => Promise<Mission | undefined>;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);
const initialSnapshot = createDemoSnapshot();

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The request could not be completed. Please try again.';
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [profileId, setProfileId] = useState<string | undefined>(initialSnapshot.profileId);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(initialSnapshot.name);
  const [phone, setPhone] = useState(initialSnapshot.phone);
  const [points, setPoints] = useState(initialSnapshot.points);
  const [missions, setMissions] = useState<Mission[]>(initialSnapshot.missions);
  const [referralCode, setReferralCode] = useState(initialSnapshot.referralCode);
  const [referralUrl, setReferralUrl] = useState(initialSnapshot.referralUrl);
  const [backendMode, setBackendMode] = useState<BackendMode>(initialSnapshot.backendMode);
  const [claimingMissionId, setClaimingMissionId] = useState<MissionId | undefined>();
  const [error, setError] = useState<string | undefined>();

  const login = useCallback(async (form: AuthFormState) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await loginWithBackend(form);

      if (!result.ok) {
        setError(result.reason);
        return result;
      }

      setProfileId(result.snapshot.profileId);
      setName(result.snapshot.name);
      setPhone(result.snapshot.phone);
      setPoints(result.snapshot.points);
      setMissions(result.snapshot.missions);
      setReferralCode(result.snapshot.referralCode);
      setReferralUrl(result.snapshot.referralUrl);
      setBackendMode(result.snapshot.backendMode);
      setIsLoggedIn(true);

      return { ok: true as const };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const snapshot = createDemoSnapshot({ name, phone });

    setProfileId(undefined);
    setIsLoggedIn(false);
    setMissions(snapshot.missions);
    setPoints(snapshot.points);
    setReferralCode(snapshot.referralCode);
    setReferralUrl(snapshot.referralUrl);
    setBackendMode(snapshot.backendMode);
    setClaimingMissionId(undefined);
    setError(undefined);
  }, [name, phone]);

  const claimMission = useCallback(
    async (id: MissionId): Promise<Mission | undefined> => {
      const mission = missions.find((m) => m.id === id);
      if (!mission || mission.completed) return undefined;

      if (!profileId) {
        setMissions((current) =>
          current.map((m) => (m.id === id ? { ...m, completed: true } : m)),
        );
        setPoints((current) => current + mission.points);
        return mission;
      }

      setClaimingMissionId(id);
      setError(undefined);

      try {
        const claimed = await claimMissionWithBackend(profileId, id, missions);

        if (!claimed) {
          return undefined;
        }

        setMissions(claimed.missions);
        setPoints(claimed.points);
        return claimed.mission;
      } catch (claimError) {
        const message = getErrorMessage(claimError);
        setError(message);
        throw new Error(message);
      } finally {
        setClaimingMissionId(undefined);
      }
    },
    [missions, profileId],
  );

  const completedCount = useMemo(
    () => missions.filter((m) => m.completed).length,
    [missions],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      profileId,
      isLoggedIn,
      isLoading,
      name,
      phone,
      points,
      missions,
      referralCode,
      referralUrl,
      backendMode,
      completedCount,
      claimingMissionId,
      error,
      setName,
      setPhone,
      login,
      logout,
      claimMission,
    }),
    [
      profileId,
      isLoggedIn,
      isLoading,
      name,
      phone,
      points,
      missions,
      referralCode,
      referralUrl,
      backendMode,
      completedCount,
      claimingMissionId,
      error,
      login,
      logout,
      claimMission,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be called inside <AppStateProvider>');
  }
  return ctx;
}
