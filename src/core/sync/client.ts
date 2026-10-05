// Cloud sync client (PLAN-IMPROVEMENTS.md, 6.3). Uploads the outbox, then
// downloads everything after the cursor and merges it into the repository.
// The device stays the source of truth: without network nothing changes for
// the user, events wait in the outbox.
import type { Clock, Scheduler, TimerHandle } from '../platform';
import type { Repository } from '../storage/repository';
import type { StoredEvent } from '../storage/schema';
import { SYNC_PROTOCOL, type DeleteResponse, type DownloadResponse, type UploadResponse } from './protocol';

export type SyncState = 'disabled' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  /** epoch ms of the last complete sync */
  lastSyncedAt: number | null;
  /** Events waiting for upload */
  pending: number;
  /** HTTP status or "network" for the last failure */
  error: string | null;
}

export interface SyncSettings {
  /** The anonymous key (created on first use); null while sync is off */
  key(): string | null;
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface SyncClientOptions {
  repository: Repository;
  settings: SyncSettings;
  api: string;
  fetch: FetchLike;
  scheduler: Scheduler;
  clock: Clock;
  timeoutMs?: number;
  /** Quiet time before a requested sync runs, so a burst of changes is one sync */
  debounceMs?: number;
}

/** Retry delays after consecutive failures */
export const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000] as const;

class SyncHttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === 'object' && u !== null;
}

const bodyLimit = SYNC_PROTOCOL.maxBody - 1024;

/** Splits the outbox into requests that respect the batch and body limits. */
export function chunkEvents(events: readonly StoredEvent[]): StoredEvent[][] {
  const chunks: StoredEvent[][] = [];
  let current: StoredEvent[] = [];
  let size = 0;
  for (const e of events) {
    const bytes = JSON.stringify(e).length + 1;
    if (current.length > 0 && (current.length >= SYNC_PROTOCOL.maxBatch || size + bytes > bodyLimit)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(e);
    size += bytes;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export class SyncClient {
  private status: SyncStatus;
  private readonly listeners = new Set<(status: SyncStatus) => void>();
  private running: Promise<void> | null = null;
  private next: Promise<void> | null = null;
  private failures = 0;
  private timer: TimerHandle | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastOutbox = 0;

  constructor(private readonly options: SyncClientOptions) {
    this.status = {
      state: options.settings.key() ? 'idle' : 'disabled',
      lastSyncedAt: null,
      pending: options.repository.snapshot.outbox.length,
      error: null,
    };
  }

  get current(): SyncStatus {
    return this.status;
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Syncs now and whenever new events appear locally. */
  start(): void {
    if (this.unsubscribe) return;
    this.lastOutbox = this.options.repository.snapshot.outbox.length;
    this.unsubscribe = this.options.repository.subscribe(() => {
      const pending = this.options.repository.snapshot.outbox.length;
      if (pending !== this.status.pending) this.update({});
      if (pending > this.lastOutbox) this.request();
      this.lastOutbox = pending;
    });
    this.request(0);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearTimer();
  }

  /** Asks for a sync soon (debounced). Platform triggers call this: online, app resumed. */
  request(delayMs = this.options.debounceMs ?? 1000): void {
    this.clearTimer();
    this.timer = this.options.scheduler.setTimeout(() => {
      this.timer = null;
      void this.sync();
    }, delayMs);
  }

  /**
   * One full round: upload, then download. A call during a run queues exactly
   * one follow-up run (it may carry newer changes) and resolves when that ends.
   */
  sync(): Promise<void> {
    if (this.running) {
      this.next ??= this.running.then(() => {
        this.next = null;
        return this.sync();
      });
      return this.next;
    }
    this.running = this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** Deletes this key's cloud copy. Local data stays. */
  async deleteRemote(): Promise<number> {
    const key = this.options.settings.key();
    if (!key) return 0;
    const body = await this.call('DELETE', '/v1/account', key);
    return isRecord(body) && typeof body.deleted === 'number' ? (body as unknown as DeleteResponse).deleted : 0;
  }

  private async run(): Promise<void> {
    const key = this.options.settings.key();
    if (!key) {
      this.update({ state: 'disabled', error: null });
      return;
    }
    this.update({ state: 'syncing', error: null });
    try {
      await this.uploadAll(key);
      await this.downloadAll(key);
      this.failures = 0;
      this.update({ state: 'idle', lastSyncedAt: this.options.clock.wallNow() });
    } catch (err) {
      const network = !(err instanceof SyncHttpError);
      this.update({ state: network ? 'offline' : 'error', error: network ? 'network' : String(err.status) });
      const delay = RETRY_DELAYS_MS[Math.min(this.failures, RETRY_DELAYS_MS.length - 1)];
      this.failures++;
      this.request(delay);
    }
  }

  private async uploadAll(key: string): Promise<void> {
    const { repository } = this.options;
    const waiting = new Set(repository.snapshot.outbox);
    const events = repository.events.filter(e => waiting.has(e.id));
    for (const chunk of chunkEvents(events)) {
      const body = await this.call('POST', '/v1/events', key, JSON.stringify({ events: chunk }));
      if (!isRecord(body) || !Array.isArray(body.accepted) || !Array.isArray(body.rejected)) throw new SyncHttpError(502);
      const res = body as unknown as UploadResponse;
      repository.markSynced([...res.accepted, ...res.rejected].filter((id): id is string => typeof id === 'string'));
    }
  }

  private async downloadAll(key: string): Promise<void> {
    const { repository } = this.options;
    for (let guard = 0; guard < 1000; guard++) {
      const body = await this.call('GET', `/v1/events?after=${repository.snapshot.cursor}`, key);
      if (!isRecord(body) || !Array.isArray(body.events) || typeof body.cursor !== 'number') throw new SyncHttpError(502);
      const page = body as unknown as DownloadResponse;
      repository.mergeRemote(page.events, page.cursor);
      // What came down is on the server already; it must not be re-uploaded
      repository.markSynced(page.events.map(e => (isRecord(e) && typeof e.id === 'string' ? e.id : '')).filter(Boolean));
      if (!page.more) return;
    }
  }

  private async call(method: string, path: string, key: string, body?: string): Promise<unknown> {
    const { scheduler } = this.options;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = scheduler.setTimeout(() => controller?.abort(), this.options.timeoutMs ?? 10_000);
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const res = await this.options.fetch(`${this.options.api}${path}`, { method, headers, body, signal: controller?.signal });
      if (!res.ok) throw new SyncHttpError(res.status);
      return await res.json();
    } finally {
      scheduler.clearTimeout(timeout);
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.options.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private update(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch, pending: this.options.repository.snapshot.outbox.length };
    for (const listener of this.listeners) listener(this.status);
  }
}
