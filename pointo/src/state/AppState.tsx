import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState as RNAppState,
  Platform,
  type AppStateStatus,
} from 'react-native';
import * as Linking from 'expo-linking';
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
  parseReferralUrl,
  tryRedeemReferralCode,
  REFERRAL_INSTALL_REWARD,
} from '../services/referral';
import {
  localDayKey,
  newlyCrossedMilestones,
  stepsCounter,
  WALK_MISSION_COMPLETION_STEPS,
  type StepsAuthorization,
} from '../services/steps';
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

export type ReferralRedemption = {
  code: string;
  pointsCredited: number;
  at: number;
};

export type WalkMilestoneEvent = {
  steps: number;
  pointsCredited: number;
  at: number;
};

type AppStateValue = {
  isHydrated: boolean;
  authStep: AuthStep;
  user: AuthenticatedUser | null;
  points: number;
  missions: Mission[];
  referralCode: string;
  referralUrl: string;
  completedCount: number;
  lastReferralRedemption: ReferralRedemption | null;

  todaySteps: number;
  stepsAuthorization: StepsAuthorization;
  creditedWalkMilestones: ReadonlyArray<number>;
  lastWalkMilestone: WalkMilestoneEvent | null;

  requestCode: (phone: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  verifyCode: (
    code: string,
    displayName: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  cancelCodeEntry: () => void;
  logout: () => Promise<void>;
  claimMission: (id: MissionId) => Mission | undefined;

  /**
   * Process a Universal Link / custom-scheme URL. Returns the credited
   * reward when the code is fresh, otherwise null. The result is also
   * exposed via `lastReferralRedemption` so the UI can show a celebration.
   */
  handleIncomingUrl: (url: string) => Promise<ReferralRedemption | null>;
  acknowledgeReferralRedemption: () => void;

  startStepTracking: () => Promise<void>;
  injectDemoSteps: (amount: number) => void;
  resetDemoSteps: () => void;
  acknowledgeWalkMilestone: () => void;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>({ kind: 'idle' });
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [points, setPoints] = useState(INITIAL_POINTS);
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const [lastReferralRedemption, setLastReferralRedemption] =
    useState<ReferralRedemption | null>(null);

  const [todaySteps, setTodaySteps] = useState(0);
  const [stepsAuthorization, setStepsAuthorization] =
    useState<StepsAuthorization>('unknown');
  const [walkMilestoneDay, setWalkMilestoneDay] = useState<string | null>(null);
  const [creditedWalkMilestones, setCreditedWalkMilestones] = useState<number[]>([]);
  const [lastWalkMilestone, setLastWalkMilestone] =
    useState<WalkMilestoneEvent | null>(null);

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

        // Daily milestone reset: if the persisted day key doesn't match
        // today we drop the credited-milestone list so a new set of
        // step rewards can be earned.
        const today = localDayKey();
        if (snapshot.walkMilestoneDay === today) {
          setWalkMilestoneDay(today);
          setCreditedWalkMilestones(snapshot.creditedWalkMilestones);
        } else {
          setWalkMilestoneDay(today);
          setCreditedWalkMilestones([]);
        }
      } else {
        setWalkMilestoneDay(localDayKey());
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
      version: 3,
      user,
      points,
      completedMissionIds: missions.filter((m) => m.completed).map((m) => m.id),
      walkMilestoneDay,
      creditedWalkMilestones,
    };
    void saveLedger(snapshot);
  }, [user, points, missions, walkMilestoneDay, creditedWalkMilestones]);

  // ---------------------------------------------------------------------
  // Step tracking
  // ---------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = stepsCounter.subscribe((state) => {
      setStepsAuthorization(state.authorization);
      setTodaySteps(state.todaySteps);
    });
    return unsubscribe;
  }, []);

  // Auto-start the watcher for authenticated sessions once hydrated.
  useEffect(() => {
    if (!isHydrated) return;
    if (authStep.kind !== 'authenticated') return;
    void stepsCounter.start();
  }, [isHydrated, authStep.kind]);

  // Re-seed steps and check for day rollover whenever the app returns to
  // foreground. Closes two gaps from Phase 2.3:
  //   1. Steps walked while the app was backgrounded are now picked up
  //      immediately instead of waiting for the next watchStepCount tick.
  //   2. If the app sat open across midnight without any step changes,
  //      the previous day's credited-milestones list is cleared as soon
  //      as the user returns.
  useEffect(() => {
    if (!isHydrated) return;
    if (authStep.kind !== 'authenticated') return;
    if (Platform.OS === 'web') return; // no Pedometer / AppState on web

    const handleChange = (status: AppStateStatus) => {
      if (status !== 'active') return;

      const today = localDayKey();
      if (walkMilestoneDay !== today) {
        stepsCounter.resetForNewDay();
        setWalkMilestoneDay(today);
        setCreditedWalkMilestones([]);
        return;
      }

      void stepsCounter.refreshFromForeground();
    };

    const subscription = RNAppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [isHydrated, authStep.kind, walkMilestoneDay]);

  // Credit any milestones the current step count newly crosses.
  useEffect(() => {
    if (!isHydrated) return;
    if (authStep.kind !== 'authenticated') return;

    // Daily-rollover detection driven by the steps update tick.
    const today = localDayKey();
    if (walkMilestoneDay !== today) {
      stepsCounter.resetForNewDay();
      setWalkMilestoneDay(today);
      setCreditedWalkMilestones([]);
      return;
    }

    const credited = new Set(creditedWalkMilestones);
    const newlyCrossed = newlyCrossedMilestones(todaySteps, credited);
    if (newlyCrossed.length === 0) return;

    const lastNew = newlyCrossed[newlyCrossed.length - 1];
    const totalNewReward = newlyCrossed.reduce((acc, m) => acc + m.reward, 0);

    setPoints((current) => current + totalNewReward);
    setCreditedWalkMilestones([...credited, ...newlyCrossed.map((m) => m.steps)]);
    setLastWalkMilestone({
      steps: lastNew.steps,
      pointsCredited: totalNewReward,
      at: Date.now(),
    });

    // Cross the 'walk' mission as complete once the daily goal is hit.
    if (todaySteps >= WALK_MISSION_COMPLETION_STEPS) {
      setMissions((current) =>
        current.map((m) => (m.id === 'walk' ? { ...m, completed: true } : m)),
      );
    }
  }, [
    isHydrated,
    authStep.kind,
    todaySteps,
    walkMilestoneDay,
    creditedWalkMilestones,
  ]);

  // ---------------------------------------------------------------------
  // Deep-link / referral ingestion
  // ---------------------------------------------------------------------
  const handleIncomingUrl = useCallback(
    async (url: string): Promise<ReferralRedemption | null> => {
      const parsed = parseReferralUrl(url);
      if (!parsed) return null;

      // Don't credit users for opening their own invite link.
      if (user && parsed.code === referralCodeForUserId(user.id)) {
        return null;
      }

      const fresh = await tryRedeemReferralCode(parsed.code);
      if (!fresh) return null;

      const credited = REFERRAL_INSTALL_REWARD;
      setPoints((current) => current + credited);
      setMissions((current) =>
        current.map((m) => (m.id === 'install' ? { ...m, completed: true } : m)),
      );

      const redemption: ReferralRedemption = {
        code: parsed.code,
        pointsCredited: credited,
        at: Date.now(),
      };
      setLastReferralRedemption(redemption);
      return redemption;
    },
    [user],
  );

  const acknowledgeReferralRedemption = useCallback(() => {
    setLastReferralRedemption(null);
  }, []);

  // Listen for inbound URLs once hydration completes. We check the initial
  // URL (cold-start) and subscribe to runtime events (warm-start).
  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;

    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial && !cancelled) {
        await handleIncomingUrl(initial);
      }
    })();

    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isHydrated, handleIncomingUrl]);

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
    setCreditedWalkMilestones([]);
    setLastWalkMilestone(null);
    stepsCounter.stop();
    stepsCounter.resetDemoSteps();
    await Promise.all([clearAuthToken(), clearLedger()]);
  }, []);

  // ---------------------------------------------------------------------
  // Step-tracking actions
  // ---------------------------------------------------------------------
  const startStepTracking = useCallback(async () => {
    await stepsCounter.start();
  }, []);

  const injectDemoSteps = useCallback((amount: number) => {
    stepsCounter.injectDemoSteps(amount);
  }, []);

  const resetDemoSteps = useCallback(() => {
    stepsCounter.resetDemoSteps();
  }, []);

  const acknowledgeWalkMilestone = useCallback(() => {
    setLastWalkMilestone(null);
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
      lastReferralRedemption,
      todaySteps,
      stepsAuthorization,
      creditedWalkMilestones,
      lastWalkMilestone,
      requestCode,
      verifyCode,
      cancelCodeEntry,
      logout,
      claimMission,
      handleIncomingUrl,
      acknowledgeReferralRedemption,
      startStepTracking,
      injectDemoSteps,
      resetDemoSteps,
      acknowledgeWalkMilestone,
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
      lastReferralRedemption,
      todaySteps,
      stepsAuthorization,
      creditedWalkMilestones,
      lastWalkMilestone,
      requestCode,
      verifyCode,
      cancelCodeEntry,
      logout,
      claimMission,
      handleIncomingUrl,
      acknowledgeReferralRedemption,
      startStepTracking,
      injectDemoSteps,
      resetDemoSteps,
      acknowledgeWalkMilestone,
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
