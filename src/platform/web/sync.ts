// Web side of cloud sync: where the key lives and what wakes the client up.
import { SyncClient, type FetchLike, type SyncSettings } from '../../core/sync/client';
import { encodeKey, isSyncKey, KEY_BYTES } from '../../core/sync/key';
import type { Clock, Scheduler } from '../../core/platform';
import type { Repository } from '../../core/storage/repository';
import type { LocalStorageStore } from './index';

export const SYNC_API: string =
  (import.meta.env.VITE_SYNC_API as string | undefined) ?? 'https://brain-trainer-sync.dmitry-weiner.workers.dev';

const KEY = 'brain-trainer-sync-key';
const ENABLED = 'brain-trainer-sync-enabled';

/** The anonymous key and the on/off switch, kept outside the event log. */
export class WebSyncSettings implements SyncSettings {
  private readonly listeners = new Set<() => void>();
  private cachedKey: string | null;
  private on: boolean;

  constructor(private readonly store: LocalStorageStore) {
    const saved = store.getSync(KEY);
    this.cachedKey = isSyncKey(saved) ? saved : null;
    this.on = store.getSync(ENABLED) !== 'false';
  }

  /** Null while sync is off; creates the key on first use */
  key(): string | null {
    return this.on ? this.currentKey() : null;
  }

  currentKey(): string {
    if (!this.cachedKey) this.save(encodeKey(crypto.getRandomValues(new Uint8Array(KEY_BYTES))));
    return this.cachedKey!;
  }

  get enabled(): boolean {
    return this.on;
  }

  setEnabled(on: boolean): void {
    this.on = on;
    void this.store.set(ENABLED, String(on)).catch(() => undefined);
    this.notify();
  }

  /** Use another device's key from now on */
  useKey(key: string): void {
    if (!isSyncKey(key)) throw new Error('invalid sync key');
    this.save(key);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private save(key: string): void {
    this.cachedKey = key;
    void this.store.set(KEY, key).catch(() => undefined);
    this.notify();
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

export interface WebSync {
  client: SyncClient;
  settings: WebSyncSettings;
  /** Link to open on another device */
  linkFor(key: string): string;
  /** Switch this device to `key`: local events go up under it, its events come down. */
  connect(key: string): Promise<void>;
  stop(): void;
}

export function createWebSync(deps: {
  repository: Repository;
  scheduler: Scheduler;
  clock: Clock;
  store: LocalStorageStore;
  /** Defaults to the browser's fetch */
  fetch?: FetchLike;
}): WebSync {
  const settings = new WebSyncSettings(deps.store);
  const client = new SyncClient({
    repository: deps.repository,
    settings,
    api: SYNC_API,
    fetch: deps.fetch ?? (((url, init) => fetch(url, init)) as FetchLike),
    scheduler: deps.scheduler,
    clock: deps.clock,
  });

  const wake = () => client.request(0);
  const onVisible = () => {
    if (document.visibilityState === 'visible') wake();
  };
  window.addEventListener('online', wake);
  document.addEventListener('visibilitychange', onVisible);
  const offSettings = settings.subscribe(wake);
  client.start();

  return {
    client,
    settings,
    linkFor: key => `${window.location.origin}${window.location.pathname}#sync=${key}`,
    async connect(key) {
      settings.useKey(key);
      settings.setEnabled(true);
      deps.repository.resetSync();
      await client.sync();
    },
    stop() {
      client.stop();
      offSettings();
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}
