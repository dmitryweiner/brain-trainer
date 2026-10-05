// The local event store. Changes apply in memory synchronously (the UI reads
// them right away) and are persisted in the background. Every write merges
// with what is stored, so two tabs never drop each other's sessions; the same
// union is how cloud sync will merge devices.
import type { Clock, KeyValueStore } from '../platform';
import type { GameId, GameSession } from '../types';
import {
  emptyData, sanitizeData, sanitizeEvent, sanitizeSession, type StoredDataV2, type StoredEvent,
} from './schema';
import { migrateV1, STORAGE_KEYS } from './migrate';

export interface RepositoryOptions {
  store: KeyValueStore;
  clock: Clock;
  /** Rates v1 records during migration */
  legacyRating: (gameId: GameId, score: number) => number;
  onError?: (error: unknown) => void;
}

/** Raw stored strings the repository starts from */
export interface RawStorage {
  v2: string | null;
  v1Results: string | null;
  v1TotalScore: string | null;
}

function parse(text: string | null): unknown {
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Union by event id; `a` wins on duplicates (events are immutable, so they are equal). */
export function mergeData(a: StoredDataV2, b: StoredDataV2): StoredDataV2 {
  const ids = new Set(a.events.map(e => e.id));
  const events = [...a.events, ...b.events.filter(e => !ids.has(e.id))];
  return {
    ...a,
    events,
    outbox: [...new Set([...a.outbox, ...b.outbox])],
    cursor: Math.max(a.cursor, b.cursor),
  };
}

export class Repository {
  private data: StoredDataV2;
  private readonly listeners = new Set<() => void>();
  private writing: Promise<void> = Promise.resolve();
  private unwatch: (() => void) | undefined;
  /** Ids the cloud confirmed during this run; stale copies of the outbox must not bring them back */
  private readonly confirmed = new Set<string>();

  private constructor(private readonly options: RepositoryOptions, data: StoredDataV2) {
    this.data = data;
    this.unwatch = options.store.watch?.(STORAGE_KEYS.v2, () => void this.reloadFromStore());
  }

  static async open(options: RepositoryOptions): Promise<Repository> {
    const { store } = options;
    const v2 = await store.get(STORAGE_KEYS.v2);
    const raw: RawStorage = v2 !== null
      ? { v2, v1Results: null, v1TotalScore: null }
      : { v2, v1Results: await store.get(STORAGE_KEYS.v1Results), v1TotalScore: await store.get(STORAGE_KEYS.v1TotalScore) };
    const repo = Repository.restore(options, raw);
    await repo.flush();
    return repo;
  }

  /**
   * Builds the repository from already-read values (for stores that can be read
   * synchronously, e.g. localStorage). Writes the migration result in the background.
   */
  static restore(options: RepositoryOptions, raw: RawStorage): Repository {
    let data: StoredDataV2;
    let corrupt: string | null = null;
    if (raw.v2 === null) {
      data = migrateV1(parse(raw.v1Results), parse(raw.v1TotalScore), options.legacyRating);
    } else {
      const sane = sanitizeData(parse(raw.v2));
      data = sane ?? emptyData();
      if (!sane) corrupt = raw.v2;
    }
    const repo = new Repository(options, data);
    if (raw.v2 === null || corrupt !== null) {
      // v1 keys stay untouched: the old version keeps working if we roll back
      repo.writing = (async () => {
        if (corrupt !== null) await options.store.set(STORAGE_KEYS.v2Corrupt, corrupt);
        await options.store.set(STORAGE_KEYS.v2, JSON.stringify(data));
      })().catch(err => options.onError?.(err));
    }
    return repo;
  }

  get snapshot(): StoredDataV2 {
    return this.data;
  }

  get events(): readonly StoredEvent[] {
    return this.data.events;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addSession(session: GameSession): void {
    const clean = sanitizeSession(session);
    if (!clean) throw new Error('invalid session');
    this.append({ kind: 'session', id: clean.id, session: clean });
  }

  /** Stops counting sessions of one game (or all games) recorded until now. */
  reset(gameId: GameId | null): void {
    this.append({ kind: 'reset', id: this.options.clock.newId(), at: this.options.clock.wallNow(), gameId });
  }

  /** Adds events from elsewhere (cloud); returns how many were new. */
  mergeRemote(events: unknown[], cursor: number): number {
    const incoming = events.map(sanitizeEvent).filter((e): e is StoredEvent => e !== null);
    const before = this.data.events.length;
    const merged = mergeData(this.data, { ...emptyData(), events: incoming, cursor });
    this.commit(merged);
    return merged.events.length - before;
  }

  /** Cloud confirmed these events */
  markSynced(ids: readonly string[]): void {
    for (const id of ids) this.confirmed.add(id);
    this.commit({ ...this.data, outbox: this.withoutConfirmed(this.data.outbox) });
  }

  /** After switching to another sync key: everything local goes up again, everything remote comes down. */
  resetSync(): void {
    this.confirmed.clear();
    this.commit({ ...this.data, outbox: this.data.events.map(e => e.id), cursor: 0 });
  }

  /** Resolves when everything written so far is persisted. */
  flush(): Promise<void> {
    return this.writing;
  }

  close(): void {
    this.unwatch?.();
    this.listeners.clear();
  }

  private append(event: StoredEvent): void {
    if (this.data.events.some(e => e.id === event.id)) return;
    this.commit({
      ...this.data,
      events: [...this.data.events, event],
      outbox: [...this.data.outbox, event.id],
    });
  }

  private commit(next: StoredDataV2): void {
    this.data = next;
    this.notify();
    this.writing = this.writing.then(() => this.persist()).catch(err => this.options.onError?.(err));
  }

  private withoutConfirmed(outbox: readonly string[]): string[] {
    return outbox.filter(id => !this.confirmed.has(id));
  }

  private async persist(): Promise<void> {
    const stored = sanitizeData(parse(await this.options.store.get(STORAGE_KEYS.v2))) ?? emptyData();
    // Another tab may have confirmed or added events meanwhile; keep both.
    const merged = {
      ...mergeData(this.data, { ...stored, outbox: this.withoutConfirmed(stored.outbox) }),
      // This tab's cursor wins: it may have been reset on purpose, and a
      // lower cursor only means re-downloading events we already have.
      cursor: this.data.cursor,
    };
    await this.options.store.set(STORAGE_KEYS.v2, JSON.stringify(merged));
    if (merged.events.length !== this.data.events.length || merged.outbox.length !== this.data.outbox.length) {
      this.data = merged;
      this.notify();
    }
  }

  private async reloadFromStore(): Promise<void> {
    const stored = sanitizeData(parse(await this.options.store.get(STORAGE_KEYS.v2)));
    if (!stored) return;
    const merged = mergeData(this.data, { ...stored, outbox: this.withoutConfirmed(stored.outbox) });
    if (merged.events.length !== this.data.events.length) {
      this.data = merged;
      this.notify();
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
