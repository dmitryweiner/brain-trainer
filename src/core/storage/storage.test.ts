import { describe, it, expect } from 'vitest';
import type { Clock, KeyValueStore } from '../platform';
import { SCHEMA_VERSION, type GameSession } from '../types';
import { migrateV1, STORAGE_KEYS } from './migrate';
import { Repository } from './repository';
import { sanitizeData, sanitizeEvent, sanitizeSession } from './schema';

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>();
  private watchers = new Map<string, Set<() => void>>();
  async get(key: string) { return this.map.get(key) ?? null; }
  async set(key: string, value: string) { this.map.set(key, value); }
  async remove(key: string) { this.map.delete(key); }
  watch(key: string, listener: () => void) {
    const set = this.watchers.get(key) ?? new Set();
    set.add(listener);
    this.watchers.set(key, set);
    return () => set.delete(listener);
  }
  /** What another tab writing would look like */
  externalSet(key: string, value: string) {
    this.map.set(key, value);
    this.watchers.get(key)?.forEach(l => l());
  }
}

function clock(start = 1_000_000): Clock {
  let t = start;
  let n = 0;
  return { wallNow: () => t++, newId: () => `id-${++n}` };
}

const legacyRating = (_: string, score: number) => score * 10;

function session(id: string, over: Partial<GameSession> = {}): GameSession {
  return {
    id, gameId: 'reaction-click', schemaVersion: SCHEMA_VERSION, startedAt: 1000, durationMs: 5000,
    level: 1, score: 10, rating: 400, accuracy: 80, avgTimeMs: 300, metrics: { bestReactionMs: 220 }, ...over,
  };
}

describe('schema', () => {
  it('accepts a valid session and rejects broken ones', () => {
    expect(sanitizeSession(session('a'))).toEqual(session('a'));
    expect(sanitizeSession({ ...session('a'), gameId: 'nope' })).toBeNull();
    expect(sanitizeSession({ ...session('a'), rating: 1001 })).toBeNull();
    expect(sanitizeSession({ ...session('a'), accuracy: NaN })).toBeNull();
    expect(sanitizeSession({ ...session('a'), id: 'has space' })).toBeNull();
    expect(sanitizeSession({ ...session('a'), metrics: { x: 'y' } })).toBeNull();
  });

  it('requires a session event id to match its session', () => {
    expect(sanitizeEvent({ kind: 'session', id: 'b', session: session('a') })).toBeNull();
    expect(sanitizeEvent({ kind: 'reset', id: 'r', at: 5, gameId: null })).toEqual({ kind: 'reset', id: 'r', at: 5, gameId: null });
    expect(sanitizeEvent({ kind: 'reset', id: 'r', at: 5, gameId: 'zzz' })).toBeNull();
  });

  it('drops invalid and duplicate events but keeps the rest', () => {
    const data = sanitizeData({
      schemaVersion: 2,
      events: [{ kind: 'session', id: 'a', session: session('a') }, { kind: 'bogus' }, { kind: 'session', id: 'a', session: session('a') }],
      outbox: ['a', 'missing'],
      cursor: 3,
    });
    expect(data?.events.map(e => e.id)).toEqual(['a']);
    expect(data?.outbox).toEqual(['a']);
    expect(data?.cursor).toBe(3);
  });
});

describe('migrateV1', () => {
  it('turns v1 records into level-1 sessions rated on the v1 scale', () => {
    const data = migrateV1(
      [
        { gameId: 'reaction-click', score: 20, accuracy: 100, averageTime: 300, timestamp: 1700000000000 },
        { gameId: 'memory-flip', score: 50, accuracy: 100, averageTime: null, timestamp: 1700000001000 },
        { gameId: 'unknown', score: 1, accuracy: 1, averageTime: 1, timestamp: 1 },
      ],
      70,
      legacyRating,
    );
    expect(data.events).toHaveLength(2);
    const [a, b] = data.events.map(e => (e.kind === 'session' ? e.session : null));
    expect(a).toMatchObject({ gameId: 'reaction-click', level: 1, score: 20, rating: 200, avgTimeMs: 300, metrics: {} });
    // MemoryFlip v1 stored NaN → null for averageTime
    expect(b).toMatchObject({ gameId: 'memory-flip', avgTimeMs: 0, rating: 500 });
    expect(data.outbox).toEqual(data.events.map(e => e.id));
  });

  it('is deterministic', () => {
    const v1 = [{ gameId: 'n-back', score: 5, accuracy: 50, averageTime: 900, timestamp: 1700000000000 }];
    expect(migrateV1(v1, 5, legacyRating)).toEqual(migrateV1(v1, 5, legacyRating));
  });

  it('keeps XP the history does not explain', () => {
    const data = migrateV1([{ gameId: 'n-back', score: 5, accuracy: 50, averageTime: 900, timestamp: 1700000000000 }], 30, legacyRating);
    expect(data.events.find(e => e.kind === 'xp')).toMatchObject({ amount: 25 });
  });

  it('copes with no v1 data', () => {
    expect(migrateV1(undefined, undefined, legacyRating).events).toEqual([]);
  });
});

describe('Repository', () => {
  it('migrates v1 once and leaves the v1 keys in place', async () => {
    const store = new MemoryStore();
    store.map.set(STORAGE_KEYS.v1Results, JSON.stringify([{ gameId: 'flags-game', score: 40, accuracy: 80, averageTime: 2000, timestamp: 1700000000000 }]));
    store.map.set(STORAGE_KEYS.v1TotalScore, '40');

    const repo = await Repository.open({ store, clock: clock(), legacyRating });
    expect(repo.events).toHaveLength(1);
    expect(store.map.has(STORAGE_KEYS.v1Results)).toBe(true);

    store.map.set(STORAGE_KEYS.v1Results, '[]');
    const again = await Repository.open({ store, clock: clock(), legacyRating });
    expect(again.events).toHaveLength(1);
  });

  it('persists sessions and resets, and notifies', async () => {
    const store = new MemoryStore();
    const repo = await Repository.open({ store, clock: clock(), legacyRating });
    let calls = 0;
    repo.subscribe(() => calls++);

    repo.addSession(session('s1'));
    repo.reset('reaction-click');
    expect(repo.events.map(e => e.kind)).toEqual(['session', 'reset']);
    await repo.flush();

    const reopened = await Repository.open({ store, clock: clock(), legacyRating });
    expect(reopened.events.map(e => e.id)).toEqual(['s1', 'id-1']);
    expect(reopened.snapshot.outbox).toEqual(['s1', 'id-1']);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('rejects an invalid session', async () => {
    const repo = await Repository.open({ store: new MemoryStore(), clock: clock(), legacyRating });
    expect(() => repo.addSession({ ...session('x'), rating: 5000 })).toThrow();
  });

  it('does not lose sessions written by another tab', async () => {
    const store = new MemoryStore();
    const tabA = await Repository.open({ store, clock: clock(), legacyRating });
    const tabB = await Repository.open({ store, clock: clock(), legacyRating });

    tabA.addSession(session('from-a'));
    await tabA.flush();
    tabB.addSession(session('from-b'));
    await tabB.flush();

    const stored = JSON.parse(store.map.get(STORAGE_KEYS.v2)!);
    expect(stored.events.map((e: { id: string }) => e.id).sort()).toEqual(['from-a', 'from-b']);
  });

  it('picks up changes announced by the store', async () => {
    const store = new MemoryStore();
    const repo = await Repository.open({ store, clock: clock(), legacyRating });
    const other = { schemaVersion: 2, events: [{ kind: 'session', id: 'x', session: session('x') }], outbox: ['x'], cursor: 0 };
    store.externalSet(STORAGE_KEYS.v2, JSON.stringify(other));
    await new Promise(r => setTimeout(r, 0));
    expect(repo.events.map(e => e.id)).toEqual(['x']);
  });

  it('merges remote events idempotently and tracks the outbox', async () => {
    const repo = await Repository.open({ store: new MemoryStore(), clock: clock(), legacyRating });
    repo.addSession(session('local'));
    const remote = [{ kind: 'session', id: 'remote', session: session('remote') }, { kind: 'junk' }];
    expect(repo.mergeRemote(remote, 7)).toBe(1);
    expect(repo.mergeRemote(remote, 7)).toBe(0);
    expect(repo.snapshot.cursor).toBe(7);
    expect(repo.snapshot.outbox).toEqual(['local']);
    repo.markSynced(['local']);
    expect(repo.snapshot.outbox).toEqual([]);
  });

  it('sets corrupt data aside instead of overwriting it', async () => {
    const store = new MemoryStore();
    store.map.set(STORAGE_KEYS.v2, '{not json');
    const repo = await Repository.open({ store, clock: clock(), legacyRating });
    expect(repo.events).toEqual([]);
    expect(store.map.get(STORAGE_KEYS.v2Corrupt)).toBe('{not json');
  });
});
