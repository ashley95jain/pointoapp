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
  DEFAULT_REFERRAL_CODE,
  INITIAL_POINTS,
  initialMissions,
  type Mission,
  type MissionId,
} from '../data/missions';
import {
  clearAuthToken,
  clearLedger,
  loadAuthToken,
  loadLedger,
  saveAuthToken,
  saveLedger,
  type LedgerSnapshot,
} from './storage';

type AuthFormState = {
  name: string;
  phone: string;
};

type AppStateValue = {
  isHydrated: boolean;
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
  logout: () => Promise<void>;
  claimMission: (id: MissionId) => Mission | undefined;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

const DEFAULT_NAME = 'Aiko';
const DEFAULT_PHONE = '080-1234-5678';

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState(DEFAULT_NAME);
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [points, setPoints] = useState(INITIAL_POINTS);
  const [missions, setMissions] = useState<Mission[]>(initialMissions);

  /**
   * Tracks whether the very first hydration pass has finished so we don't
   * accidentally overwrite the persisted snapshot with the in-memory
   * defaults on the first render pass.
   */
  const hasHydratedRef = useRef(false);

  const referralCode = DEFAULT_REFERRAL_CODE;
  const referralUrl = `https://pointo.app/join/${referralCode}`;

  // Hydrate once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [snapshot, token] = await Promise.all([loadLedger(), loadAuthToken()]);
      if (cancelled) return;

      if (snapshot) {
        // An existing token is required to consider the session "logged in"
        // — this lets Phase 2.1 invalidate sessions just by clearing the
        // token without having to also rewrite the ledger. On web,
        // SecureStore is unavailable so the token may be null even when the
        // user is logged in; trust the snapshot flag in that case.
        const sessionStillValid =
          snapshot.isLoggedIn && (Platform.OS === 'web' || !!token);
        setIsLoggedIn(sessionStillValid);
        setName(snapshot.name);
        setPhone(snapshot.phone);
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

  // Persist on every change to ledger-relevant state, but only after the
  // first hydration pass has completed.
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    const snapshot: LedgerSnapshot = {
      version: 1,
      isLoggedIn,
      name,
      phone,
      points,
      completedMissionIds: missions.filter((m) => m.completed).map((m) => m.id),
    };
    // saveLedger is fire-and-forget; we don't need to await it from a hook.
    void saveLedger(snapshot);
  }, [isLoggedIn, name, phone, points, missions]);

  const login = useCallback(
    (form: AuthFormState): { ok: true } | { ok: false; reason: string } => {
      if (!form.name.trim() || !form.phone.trim()) {
        return { ok: false, reason: 'Please enter your name and phone number to continue.' };
      }
      setName(form.name);
      setPhone(form.phone);
      setIsLoggedIn(true);
      // Placeholder token. Phase 2.1 swaps this for a real token returned
      // by the SMS provider after OTP verification.
      void saveAuthToken('pointo-dev-session');
      return { ok: true };
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsLoggedIn(false);
    setMissions(initialMissions);
    setPoints(INITIAL_POINTS);
    await Promise.all([clearAuthToken(), clearLedger()]);
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
      isHydrated,
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
      isHydrated,
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
