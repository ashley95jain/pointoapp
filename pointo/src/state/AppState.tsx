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
import { initialRewards, rewardById, type Reward, type RewardId } from '../data/rewards';
import {
  generateVoucherCode,
  nextRedemptionId,
  type Redemption,
} from '../data/redemptions';
import {
  MAX_TRANSACTION_LOG,
  nextTransactionId,
  type PointTransaction,
  type TransactionKind,
} from '../data/transactions';
import {
  authProvider,
  referralCodeForUserId,
  type AuthenticatedUser,
} from '../services/auth';
import { ledgerSync, isRetryable } from '../services/ledger';
import {
  clearOutbox,
  loadOutbox,
  saveOutbox,
} from '../services/ledgerOutbox';
import {
  cancelAllReminders,
  cancelReminder,
  fireLocalNotification,
  getExpoPushToken,
  getPermission as getNotificationPermission,
  requestPermission as requestNotificationPermission,
  scheduleDailyReminder,
  type NotificationPermission,
} from '../services/notifications';
import {
  clearNotificationPrefs,
  loadNotificationPrefs,
  saveNotificationPrefs,
} from '../services/notificationPrefs';
import Constants from 'expo-constants';
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

export type RedeemResult =
  | { ok: true; redemption: Redemption }
  | { ok: false; reason: string };

export type LedgerSyncStatus =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'ok'; at: number }
  | { kind: 'error'; at: number; reason: string };

export type NotificationPrefs = {
  walkEveningReminder: boolean;
  streakMorningReminder: boolean;
  rewardAlerts: boolean;
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  walkEveningReminder: true,
  streakMorningReminder: false,
  rewardAlerts: true,
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

  rewards: ReadonlyArray<Reward>;
  transactions: ReadonlyArray<PointTransaction>;
  redemptions: ReadonlyArray<Redemption>;
  lastRedemption: Redemption | null;
  redeemReward: (rewardId: RewardId) => RedeemResult;
  acknowledgeRedemption: () => void;

  ledgerSyncEnabled: boolean;
  ledgerSyncStatus: LedgerSyncStatus;
  outboxSize: number;
  flushLedger: () => Promise<void>;
  pullLedger: () => Promise<{ ok: true } | { ok: false; reason: string }>;

  notificationsPermission: NotificationPermission;
  pushToken: string | null;
  notificationPrefs: NotificationPrefs;
  enableNotifications: () => Promise<NotificationPermission>;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => Promise<void>;

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

  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [lastRedemption, setLastRedemption] = useState<Redemption | null>(null);

  const [ledgerSyncStatus, setLedgerSyncStatus] = useState<LedgerSyncStatus>({
    kind: 'idle',
  });
  const [outboxSize, setOutboxSize] = useState(0);

  const [notificationsPermission, setNotificationsPermission] =
    useState<NotificationPermission>('unknown');
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS,
  );

  const hasHydratedRef = useRef(false);

  // Outbox state is held in a ref so addTransaction can enqueue without
  // racing against the async setState pipeline. The ref is the source of
  // truth; outboxSize is the React-visible mirror.
  const outboxRef = useRef<PointTransaction[]>([]);
  const flushInFlightRef = useRef(false);
  const flushPendingRef = useRef(false);
  const authTokenRef = useRef<string | null>(null);

  const persistOutbox = useCallback(async () => {
    setOutboxSize(outboxRef.current.length);
    await saveOutbox(outboxRef.current);
  }, []);

  /**
   * Single source of truth for point movements. Atomically updates the
   * running balance and prepends to the transaction log (capped at
   * MAX_TRANSACTION_LOG so the persisted snapshot stays bounded). Returns
   * the synthesized transaction so callers can keep handles to it.
   */
  /**
   * Push the current outbox to the server-side ledger. No-ops when the
   * sync provider is disabled (env not configured), the outbox is empty,
   * or a flush is already in flight (the trailing call is coalesced).
   *
   * On a transient failure (network, 5xx, rate limit) we leave the queue
   * intact for the next flush. On a hard rejection from the server we
   * drop the offending entries from the outbox — the client can still
   * see them in `transactions` for the activity log, but won't keep
   * retrying.
   */
  const flushLedger = useCallback(async (): Promise<void> => {
    if (!ledgerSync.enabled) return;
    if (outboxRef.current.length === 0) return;
    if (flushInFlightRef.current) {
      flushPendingRef.current = true;
      return;
    }

    flushInFlightRef.current = true;
    setLedgerSyncStatus({ kind: 'syncing' });

    const batch = [...outboxRef.current];
    try {
      const result = await ledgerSync.push(batch, authTokenRef.current);
      const acceptedSet = new Set(result.accepted);
      const rejectedSet = new Set(result.rejected.map((r) => r.id));
      outboxRef.current = outboxRef.current.filter(
        (tx) => !acceptedSet.has(tx.id) && !rejectedSet.has(tx.id),
      );
      await persistOutbox();
      setLedgerSyncStatus({ kind: 'ok', at: Date.now() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ledger sync failed.';
      if (!isRetryable(err)) {
        // Drop the batch so we don't hammer the server with the same
        // rejected entries. They remain visible in the local
        // transaction log for diagnostics.
        const batchIds = new Set(batch.map((tx) => tx.id));
        outboxRef.current = outboxRef.current.filter((tx) => !batchIds.has(tx.id));
        await persistOutbox();
      }
      setLedgerSyncStatus({ kind: 'error', at: Date.now(), reason: message });
    } finally {
      flushInFlightRef.current = false;
      if (flushPendingRef.current) {
        flushPendingRef.current = false;
        // Tail-call the next flush. Awaiting here would deadlock the
        // worker; fire-and-forget is correct.
        void flushLedger();
      }
    }
  }, [persistOutbox]);

  const addTransaction = useCallback(
    (input: {
      kind: TransactionKind;
      delta: number;
      label: string;
      meta?: Record<string, string | number>;
    }): PointTransaction => {
      const tx: PointTransaction = {
        id: nextTransactionId(),
        kind: input.kind,
        delta: input.delta,
        label: input.label,
        at: Date.now(),
        meta: input.meta,
      };
      setPoints((current) => current + input.delta);
      setTransactions((current) => {
        const next = [tx, ...current];
        return next.length > MAX_TRANSACTION_LOG
          ? next.slice(0, MAX_TRANSACTION_LOG)
          : next;
      });

      // Enqueue for server-side ledger sync. The ref mutation is
      // intentional — the outbox is the source of truth.
      if (ledgerSync.enabled) {
        outboxRef.current = [...outboxRef.current, tx];
        void persistOutbox();
        // Best-effort immediate flush. Failures are swallowed; the
        // queue + foreground listener will retry.
        void flushLedger();
      }

      return tx;
    },
    [flushLedger, persistOutbox],
  );

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
        setTransactions(snapshot.transactions);
        setRedemptions(snapshot.redemptions);

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

      // Cache the token in the ledger-sync ref so the first push doesn't
      // race against the auth flow.
      authTokenRef.current = token;

      const [outbox, storedPrefs, currentPerm] = await Promise.all([
        loadOutbox(),
        loadNotificationPrefs(),
        getNotificationPermission(),
      ]);
      if (!cancelled) {
        outboxRef.current = outbox;
        setOutboxSize(outbox.length);
        if (storedPrefs) setNotificationPrefs(storedPrefs);
        setNotificationsPermission(currentPerm);
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
      version: 4,
      user,
      points,
      completedMissionIds: missions.filter((m) => m.completed).map((m) => m.id),
      walkMilestoneDay,
      creditedWalkMilestones,
      transactions,
      redemptions,
    };
    void saveLedger(snapshot);
  }, [
    user,
    points,
    missions,
    walkMilestoneDay,
    creditedWalkMilestones,
    transactions,
    redemptions,
  ]);

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

  // Server-side ledger flush on foreground. Independent of the steps
  // listener because sync should also tick on web, where AppState
  // changes still fire.
  useEffect(() => {
    if (!isHydrated) return;
    if (!ledgerSync.enabled) return;

    // Flush whatever's already queued (e.g. credits earned offline).
    if (outboxRef.current.length > 0) {
      void flushLedger();
    }

    const subscription = RNAppState.addEventListener('change', (status) => {
      if (status !== 'active') return;
      if (outboxRef.current.length > 0) void flushLedger();
    });
    return () => subscription.remove();
  }, [isHydrated, flushLedger]);

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

    for (const milestone of newlyCrossed) {
      addTransaction({
        kind: 'walk-milestone',
        delta: milestone.reward,
        label: `${milestone.steps.toLocaleString()} steps milestone`,
        meta: { milestoneSteps: milestone.steps },
      });
    }
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
    addTransaction,
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
      addTransaction({
        kind: 'referral-install',
        delta: credited,
        label: 'Referral install bonus',
        meta: { code: parsed.code },
      });
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
    [user, addTransaction],
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
        authTokenRef.current = result.token;
        setUser(result.user);
        setAuthStep({ kind: 'authenticated' });
        // Drain any outbox that was waiting for a fresh token.
        if (ledgerSync.enabled && outboxRef.current.length > 0) {
          void flushLedger();
        }
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
    setTransactions([]);
    setRedemptions([]);
    setLastRedemption(null);
    setLedgerSyncStatus({ kind: 'idle' });
    setOutboxSize(0);
    outboxRef.current = [];
    authTokenRef.current = null;
    setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);
    setPushToken(null);
    stepsCounter.stop();
    stepsCounter.resetDemoSteps();
    await Promise.all([
      clearAuthToken(),
      clearLedger(),
      clearOutbox(),
      clearNotificationPrefs(),
      cancelAllReminders(),
    ]);
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
  // Redemptions
  // ---------------------------------------------------------------------
  const redeemReward = useCallback(
    (rewardId: RewardId): RedeemResult => {
      const reward = rewardById(rewardId);
      if (!reward) {
        return { ok: false, reason: 'Reward not found.' };
      }
      if (points < reward.cost) {
        return {
          ok: false,
          reason: `You need ${(reward.cost - points).toLocaleString()} more points to redeem this.`,
        };
      }

      const redemption: Redemption = {
        id: nextRedemptionId(),
        rewardId: reward.id,
        rewardTitle: reward.title,
        rewardCategory: reward.category,
        pointsSpent: reward.cost,
        voucherCode: generateVoucherCode(),
        redeemedAt: Date.now(),
        status: 'fulfilled',
      };
      addTransaction({
        kind: 'redemption',
        delta: -reward.cost,
        label: `Redeemed ${reward.title}`,
        meta: { rewardId: reward.id, voucherCode: redemption.voucherCode },
      });
      setRedemptions((current) => [redemption, ...current]);
      setLastRedemption(redemption);
      return { ok: true, redemption };
    },
    [points, addTransaction],
  );

  const acknowledgeRedemption = useCallback(() => {
    setLastRedemption(null);
  }, []);

  // ---------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------
  const enableNotifications = useCallback(async (): Promise<NotificationPermission> => {
    const perm = await requestNotificationPermission();
    setNotificationsPermission(perm);
    if (perm === 'granted') {
      const projectId =
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
        Constants.easConfig?.projectId;
      const token = await getExpoPushToken(projectId);
      setPushToken(token);
    }
    return perm;
  }, []);

  const setNotificationPref = useCallback(
    async (key: keyof NotificationPrefs, value: boolean) => {
      setNotificationPrefs((current) => {
        const next = { ...current, [key]: value };
        void saveNotificationPrefs(next);
        return next;
      });
    },
    [],
  );

  // Reconcile scheduled reminders whenever prefs or permission state
  // changes. Reminders are idempotent (the service cancels by identifier
  // before scheduling), so this effect can fire freely.
  useEffect(() => {
    if (!isHydrated) return;
    if (notificationsPermission !== 'granted') {
      void cancelAllReminders();
      return;
    }

    if (notificationPrefs.walkEveningReminder) {
      void scheduleDailyReminder({
        kind: 'walk-evening',
        hour: 18,
        minute: 0,
        title: 'Keep walking, keep earning',
        body: 'Check in on your steps and bank tonight\u2019s milestones before the day rolls over.',
      });
    } else {
      void cancelReminder('walk-evening');
    }

    if (notificationPrefs.streakMorningReminder) {
      void scheduleDailyReminder({
        kind: 'streak-morning',
        hour: 9,
        minute: 0,
        title: 'New day, new points',
        body: 'A fresh set of milestones just unlocked. Lace up.',
      });
    } else {
      void cancelReminder('streak-morning');
    }
  }, [
    isHydrated,
    notificationsPermission,
    notificationPrefs.walkEveningReminder,
    notificationPrefs.streakMorningReminder,
  ]);

  // Surface big point events as local notifications when the user is
  // backgrounded. The in-app Alert already handles the foreground case;
  // we only need to back-fill the background path.
  useEffect(() => {
    if (!isHydrated) return;
    if (notificationsPermission !== 'granted') return;
    if (!notificationPrefs.rewardAlerts) return;
    if (!lastWalkMilestone) return;
    if (RNAppState.currentState === 'active') return;
    void fireLocalNotification({
      title: `+${lastWalkMilestone.pointsCredited} pt earned`,
      body: `${lastWalkMilestone.steps.toLocaleString()} steps milestone reached.`,
    });
  }, [isHydrated, notificationsPermission, notificationPrefs.rewardAlerts, lastWalkMilestone]);

  useEffect(() => {
    if (!isHydrated) return;
    if (notificationsPermission !== 'granted') return;
    if (!notificationPrefs.rewardAlerts) return;
    if (!lastRedemption) return;
    if (RNAppState.currentState === 'active') return;
    void fireLocalNotification({
      title: 'Redemption confirmed',
      body: `${lastRedemption.rewardTitle} \u00B7 ${lastRedemption.voucherCode}`,
    });
  }, [isHydrated, notificationsPermission, notificationPrefs.rewardAlerts, lastRedemption]);

  /**
   * Pull the canonical snapshot from the server and adopt it locally.
   * Any still-pending outbox entries are layered back on top so an
   * in-flight credit isn't silently lost. Returns an error result when
   * the sync is disabled or fails — call sites decide how loudly to
   * surface that.
   */
  const pullLedger = useCallback(async (): Promise<
    { ok: true } | { ok: false; reason: string }
  > => {
    if (!ledgerSync.enabled) {
      return { ok: false, reason: 'Server-side ledger sync is not configured.' };
    }
    setLedgerSyncStatus({ kind: 'syncing' });
    try {
      const remote = await ledgerSync.pull(authTokenRef.current);
      // Reconcile: server is authoritative for balance + history; any
      // still-queued local txs are layered on top with optimistic
      // credits so the user doesn't see them vanish on pull.
      const pendingIds = new Set(outboxRef.current.map((t) => t.id));
      const serverHistory = remote.transactions.filter((t) => !pendingIds.has(t.id));
      const merged = [...outboxRef.current, ...serverHistory].slice(
        0,
        MAX_TRANSACTION_LOG,
      );
      const optimisticDelta = outboxRef.current.reduce((a, t) => a + t.delta, 0);
      setPoints(remote.points + optimisticDelta);
      setTransactions(merged);
      setRedemptions(remote.redemptions);
      setLedgerSyncStatus({ kind: 'ok', at: Date.now() });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ledger pull failed.';
      setLedgerSyncStatus({ kind: 'error', at: Date.now(), reason: message });
      return { ok: false, reason: message };
    }
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
      addTransaction({
        kind: 'mission',
        delta: mission.points,
        label: mission.title,
        meta: { missionId: mission.id },
      });
      return mission;
    },
    [missions, addTransaction],
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
      rewards: initialRewards,
      transactions,
      redemptions,
      lastRedemption,
      redeemReward,
      acknowledgeRedemption,
      ledgerSyncEnabled: ledgerSync.enabled,
      ledgerSyncStatus,
      outboxSize,
      flushLedger,
      pullLedger,
      notificationsPermission,
      pushToken,
      notificationPrefs,
      enableNotifications,
      setNotificationPref,
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
      transactions,
      redemptions,
      lastRedemption,
      redeemReward,
      acknowledgeRedemption,
      ledgerSyncStatus,
      outboxSize,
      flushLedger,
      pullLedger,
      notificationsPermission,
      pushToken,
      notificationPrefs,
      enableNotifications,
      setNotificationPref,
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
