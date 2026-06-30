import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_REFERRAL_CODE,
  INITIAL_POINTS,
  initialMissions,
  type Mission,
  type MissionId,
} from '../data/missions';

type AuthFormState = {
  name: string;
  phone: string;
};

type AppStateValue = {
  isLoggedIn: boolean;
  name: string;
  phone: string;
  points: number;
  missions: Mission[];
  referralCode: string;
  referralUrl: string;
  completedCount: number;

  setName: (name: string) => void;
  setPhone: (phone: string) => void;
  login: (form: AuthFormState) => { ok: true } | { ok: false; reason: string };
  logout: () => void;
  claimMission: (id: MissionId) => Mission | undefined;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState('Aiko');
  const [phone, setPhone] = useState('080-1234-5678');
  const [points, setPoints] = useState(INITIAL_POINTS);
  const [missions, setMissions] = useState<Mission[]>(initialMissions);

  const referralCode = DEFAULT_REFERRAL_CODE;
  const referralUrl = `https://pointo.app/join/${referralCode}`;

  const login = useCallback(
    (form: AuthFormState): { ok: true } | { ok: false; reason: string } => {
      if (!form.name.trim() || !form.phone.trim()) {
        return { ok: false, reason: 'Please enter your name and phone number to continue.' };
      }
      setName(form.name);
      setPhone(form.phone);
      setIsLoggedIn(true);
      return { ok: true };
    },
    [],
  );

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setMissions(initialMissions);
    setPoints(INITIAL_POINTS);
  }, []);

  const claimMission = useCallback(
    (id: MissionId): Mission | undefined => {
      const mission = missions.find((m) => m.id === id);
      if (!mission || mission.completed) return undefined;

      setMissions((current) =>
        current.map((m) => (m.id === id ? { ...m, completed: true } : m)),
      );
      setPoints((current) => current + mission.points);
      return mission;
    },
    [missions],
  );

  const completedCount = useMemo(
    () => missions.filter((m) => m.completed).length,
    [missions],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      isLoggedIn,
      name,
      phone,
      points,
      missions,
      referralCode,
      referralUrl,
      completedCount,
      setName,
      setPhone,
      login,
      logout,
      claimMission,
    }),
    [
      isLoggedIn,
      name,
      phone,
      points,
      missions,
      referralCode,
      referralUrl,
      completedCount,
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
