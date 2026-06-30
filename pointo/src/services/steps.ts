/**
 * Pedometer wrapper. Exposes a single observable `StepsState` over a tiny
 * pub/sub interface so React state can subscribe without each consumer
 * touching `expo-sensors` directly.
 *
 * Today's step count is computed as:
 *
 *   todaySteps = historicalSinceMidnight + liveDeltaFromWatcher + demoOffset
 *
 *   - `historicalSinceMidnight` is fetched once at startup via
 *     Pedometer.getStepCountAsync(startOfDay, now). On iOS this comes from
 *     CMPedometer's historical buffer; on Android it depends on Google Fit
 *     / Health Connect availability and may be 0.
 *   - `liveDeltaFromWatcher` is the cumulative count reported by
 *     Pedometer.watchStepCount starting from "now". The watcher resets
 *     to 0 each time we call start().
 *   - `demoOffset` is the bias accumulated through `injectDemoSteps()` so
 *     testers can drive milestones from the WalkScreen even on the iOS
 *     Simulator (which does not report real steps).
 */
import { Pedometer } from 'expo-sensors';
import type { EventSubscription } from 'expo-modules-core';

export {
  WALK_MILESTONES,
  WALK_DAILY_GOAL,
  WALK_MISSION_COMPLETION_STEPS,
  caloriesFromSteps,
  distanceFromSteps,
  localDayKey,
  newlyCrossedMilestones,
} from './walkHelpers';

export type StepsAuthorization =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'unavailable';

export type StepsState = {
  authorization: StepsAuthorization;
  todaySteps: number;
  isWatching: boolean;
};

export type StepsListener = (state: StepsState) => void;

class StepsCounter {
  private state: StepsState = {
    authorization: 'unknown',
    todaySteps: 0,
    isWatching: false,
  };
  private listeners = new Set<StepsListener>();
  private subscription: EventSubscription | null = null;

  private historicalSteps = 0;
  private liveDelta = 0;
  private demoOffset = 0;

  getState(): StepsState {
    return this.state;
  }

  subscribe(listener: StepsListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Asks for permission, seeds today's count from the OS, and starts a
   * live watcher. Idempotent — calling start() while already watching is
   * a no-op.
   */
  async start(): Promise<void> {
    if (this.state.isWatching) return;

    try {
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        this.patch({ authorization: 'unavailable' });
        return;
      }
    } catch {
      this.patch({ authorization: 'unavailable' });
      return;
    }

    let permission: { status: string };
    try {
      permission = await Pedometer.requestPermissionsAsync();
    } catch {
      this.patch({ authorization: 'denied' });
      return;
    }

    if (permission.status !== 'granted') {
      this.patch({ authorization: 'denied' });
      return;
    }
    this.patch({ authorization: 'granted' });

    // Historical seed.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    try {
      const result = await Pedometer.getStepCountAsync(startOfDay, new Date());
      this.historicalSteps = Math.max(0, Math.round(result.steps ?? 0));
    } catch {
      // Some Android devices throw when there's no Google Fit / Health
      // Connect history available. That's fine — start from 0 and let the
      // live watcher accumulate.
      this.historicalSteps = 0;
    }

    this.liveDelta = 0;
    this.publishCurrent();

    // Live watcher.
    try {
      this.subscription = Pedometer.watchStepCount((result) => {
        this.liveDelta = Math.max(0, Math.round(result.steps ?? 0));
        this.publishCurrent();
      });
      this.patch({ isWatching: true });
    } catch {
      // Watch failed (e.g. permission revoked between requestPermissions
      // and watchStepCount). Leave the historical seed in place but mark
      // the counter as idle.
      this.patch({ isWatching: false });
    }
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.patch({ isWatching: false });
  }

  /**
   * Re-seed the historical count from the OS without re-prompting for
   * permission or restarting the live watcher. Intended to be called when
   * the app returns to foreground so that steps walked while the app was
   * backgrounded are picked up immediately instead of waiting for the
   * next `watchStepCount` callback.
   *
   * No-op when the counter hasn't been granted permission yet — start()
   * should always be the first call.
   */
  async refreshFromForeground(): Promise<void> {
    if (this.state.authorization !== 'granted') return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    try {
      const result = await Pedometer.getStepCountAsync(startOfDay, new Date());
      const next = Math.max(0, Math.round(result.steps ?? 0));
      // Only adopt the refreshed value when it would increase today's
      // count. Some Android setups occasionally return 0 here even when
      // a non-zero seed succeeded earlier; we don't want a transient
      // failure to visibly rewind the counter.
      if (next >= this.historicalSteps) {
        this.historicalSteps = next;
        // The live watcher's delta is measured against "when start() was
        // called", so a fresh historical seed makes that delta double-
        // count. Reset it; the watcher will keep emitting from here.
        this.liveDelta = 0;
        this.publishCurrent();
      }
    } catch {
      // Ignore — we'll catch up on the next watch tick.
    }
  }

  /**
   * Adds (or subtracts, when amount < 0) steps to the demo offset for use
   * in the iOS Simulator and during development. Has no effect on real
   * device step counts — it only biases the value reported to subscribers.
   */
  injectDemoSteps(amount: number): void {
    this.demoOffset = Math.max(
      -this.totalRealSteps(),
      this.demoOffset + amount,
    );
    this.publishCurrent();
  }

  /** Reset the demo offset and the live watcher's delta back to zero. */
  resetDemoSteps(): void {
    this.demoOffset = 0;
    this.liveDelta = 0;
    this.publishCurrent();
  }

  /**
   * Called by the daily-rollover logic in AppState when a new local day is
   * detected. Drops the historical seed, the live delta, and the demo
   * offset so the counter restarts from zero for the new day.
   */
  resetForNewDay(): void {
    this.historicalSteps = 0;
    this.liveDelta = 0;
    this.demoOffset = 0;
    this.publishCurrent();
  }

  private totalRealSteps(): number {
    return this.historicalSteps + this.liveDelta;
  }

  private publishCurrent(): void {
    this.patch({ todaySteps: this.totalRealSteps() + this.demoOffset });
  }

  private patch(part: Partial<StepsState>): void {
    this.state = { ...this.state, ...part };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const stepsCounter = new StepsCounter();
