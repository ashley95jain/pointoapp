import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  INITIAL_POINTS,
  initialMissions,
  type Mission,
  type MissionId,
} from '../data/missions';
import {
  authProvider,
  referralCodeForUserId,
  type AuthenticatedUser,
} from '../services/auth';
import {
  clearAuthToken,
  clearLedger,
  loadAuthToken,
  loadLedger,
  saveAuthToken,
  saveLedger,
  type LedgerSnapshot,
} from './storage';

export type AuthStep =
  | { kind: 'idle' }
  | { kind: 'awaiting-code'; phone: string; verificationId: string; demoCode?: string }
  | { kind: 'authenticated' };

type AppStateValue = {
  isHydrated: boolean;
  authStep: AuthStep;
  user: AuthenticatedUser | null;
  points: number;
  missions: Mission[];
  referralCode: string;
  referralUrl: string;
  completedCount: number;

  requestCode: (phone: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  verifyCode: (
    code: string,
    displayName: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  cancelCodeEntry: () => void;
  logout: () => Promise<void>;
  claimMission: (id: MissionId) => Mission | undefined;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>({ kind: 'idle' });
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [points, setPoints] = useState(INITIAL_POINTS);
  const [missions, setMissions] = useState<Mission[]>(initialMissions);

  const hasHydratedRef = useRef(false);

  const referralCode = useMemo(
    () => (user ? referralCodeForUserId(user.id) : 'PT-WELCOME'),
    [user],
  );
  const referralUrl = useMemo(
    () => `https://pointo.app/join/${referralCode}`,
    [referralCode],
  );

  // ---------------------------------------------------------------------
  // Hydration
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [snapshot, token] = await Promise.all([loadLedger(), loadAuthToken()]);
      if (cancelled) return;

      if (snapshot) {
        // A session is only restored when both the user record and an auth
        // token are present. On web, SecureStore is unavailable so we trust
        // the user record alone.
        const sessionValid =
          !!snapshot.user && (Platform.OS === 'web' || !!token);
        setUser(sessionValid ? snapshot.user : null);
        setAuthStep(sessionValid ? { kind: 'authenticated' } : { kind: 'idle' });
        setPoints(snapshot.points);
        const completedSet = new Set(snapshot.completedMissionIds);
        setMissions(
          initialMissions.map((m) => ({ ...m, completed: completedSet.has(m.id) })),
        );
      }

      hasHydratedRef.current = true;
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------
  // Persistence — only after the first hydration pass.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    const snapshot: LedgerSnapshot = {
      version: 2,
      user,
      points,
      completedMissionIds: missions.filter((m) => m.completed).map((m) => m.id),
    };
    void saveLedger(snapshot);
  }, [user, points, missions]);

  // ---------------------------------------------------------------------
  // Auth flow
  // ---------------------------------------------------------------------
  const requestCode = useCallback(
    async (phone: string): Promise<{ ok: true } | { ok: false; reason: string }> => {
      try {
        const result = await authProvider.requestCode(phone);
        setAuthStep({
          kind: 'awaiting-code',
          phone,
          verificationId: result.verificationId,
          demoCode: result.demoCode,
        });
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: errorMessage(err) };
      }
    },
    [],
  );

  const verifyCode = useCallback(
    async (
      code: string,
      displayName: string,
    ): Promise<{ ok: true } | { ok: false; reason: string }> => {
      if (authStep.kind !== 'awaiting-code') {
        return { ok: false, reason: 'No verification in progress.' };
      }
      try {
        const result = await authProvider.verifyCode({
          verificationId: authStep.verificationId,
          code,
          displayName,
        });
        await saveAuthToken(result.token);
        setUser(result.user);
        setAuthStep({ kind: 'authenticated' });
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: errorMessage(err) };
      }
    },
    [authStep],
  );

  const cancelCodeEntry = useCallback(() => {
    setAuthStep({ kind: 'idle' });
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setAuthStep({ kind: 'idle' });
    setMissions(initialMissions);
    setPoints(INITIAL_POINTS);
    await Promise.all([clearAuthToken(), clearLedger()]);
  }, []);

  // ---------------------------------------------------------------------
  // Missions
  // ---------------------------------------------------------------------
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
      isHydrated,
      authStep,
      user,
      points,
      missions,
      referralCode,
      referralUrl,
      completedCount,
      requestCode,
      verifyCode,
      cancelCodeEntry,
      logout,
      claimMission,
    }),
    [
      isHydrated,
      authStep,
      user,
      points,
      missions,
      referralCode,
      referralUrl,
      completedCount,
      requestCode,
      verifyCode,
      cancelCodeEntry,
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

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
