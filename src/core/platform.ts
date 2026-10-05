// Platform ports (PLAN-IMPROVEMENTS.md, 5.1). core/ talks to the outside world
// only through these; src/platform/<target>/ implements them (web today,
// Capacitor and React Native later).

/** String key–value store. Async so Capacitor Preferences / AsyncStorage fit. */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** Optional: notifies when another tab/process changed `key` */
  watch?(key: string, listener: () => void): () => void;
}

export type TimerHandle = unknown;

export interface Scheduler {
  /** ms on a monotonic clock (performance.now on the web) */
  now(): number;
  setTimeout(callback: () => void, delayMs: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

/** Wall clock and ids for records that leave the device. */
export interface Clock {
  /** epoch ms */
  wallNow(): number;
  newId(): string;
}

export type Route =
  | { view: 'menu' }
  | { view: 'profile' }
  | { view: 'game'; gameId: string }
  /** Opened from another device's sync link */
  | { view: 'link'; key: string };

export interface Navigation {
  current(): Route;
  go(route: Route): void;
  /** Fires on browser back/forward or the Android back button */
  subscribe(listener: (route: Route) => void): () => void;
}

export interface LocaleProvider {
  /** Saved choice, else the device language (may be unsupported) */
  initialLanguage(): string;
  save(language: string): void;
}
