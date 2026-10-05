import { describe, it, expect } from 'vitest';
import type { Clock, KeyValueStore } from '../platform';
import { Repository } from '../storage/repository';
import { SCHEMA_VERSION, type GameSession } from '../types';
import { activeSessions } from '../stats';
import { FakeScheduler } from '../testing/fakeScheduler';
import { chunkEvents, RETRY_DELAYS_MS, SyncClient } from './client';
import { FakeSyncServer as FakeServer } from '../testing/fakeSyncServer';
import { encodeKey, formatKey, parseKey, KEY_LENGTH } from './key';
import { SYNC_PROTOCOL } from './protocol';

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>();
  async get(k: string) { return this.map.get(k) ?? null; }
  async set(k: string, v: string) { this.map.set(k, v); }
  async remove(k: string) { this.map.delete(k); }
}

let ids = 0;
const clock: Clock = { wallNow: () => 1_700_000_000_000, newId: () => `id-${++ids}` };
const KEY = 'ABCD0123EFGH4567JKMN89PQ';

function session(over: Partial<GameSession> = {}): GameSession {
  const id = over.id ?? `s-${++ids}`;
  return {
    id, gameId: 'reaction-click', schemaVersion: SCHEMA_VERSION, startedAt: 1000 + ids, durationMs: 1, level: 1,
    score: 10, rating: 400, accuracy: 80, avgTimeMs: 300, metrics: {}, ...over,
  };
}

async function device(server: FakeServer, key: () => string | null = () => KEY) {
  const repository = await Repository.open({ store: new MemoryStore(), clock, legacyRating: () => 0 });
  const scheduler = new FakeScheduler();
  const client = new SyncClient({ repository, settings: { key }, api: 'https://sync.test', fetch: server.fetch, scheduler, clock });
  return { repository, scheduler, client };
}

describe('sync key', () => {
  it('encodes 120 bits as 24 Crockford characters', () => {
    const key = encodeKey(new Uint8Array(15).fill(255));
    expect(key).toBe('Z'.repeat(KEY_LENGTH));
    expect(encodeKey(new Uint8Array(15))).toBe('0'.repeat(24));
    expect(() => encodeKey(new Uint8Array(16))).toThrow();
  });

  it('parses what people type', () => {
    expect(parseKey(' abcd-0123 efgh-4567-jkmn-89pq ')).toBe(KEY);
    expect(parseKey('OOOO-IIII-LLLL-0000-1111-2222')).toBe('000011111111000011112222');
    expect(parseKey('ABCD-0123')).toBeNull();
    expect(parseKey('UUUU0123EFGH4567JKMN89PQ')).toBeNull();
    expect(formatKey(KEY)).toBe('ABCD-0123-EFGH-4567-JKMN-89PQ');
  });
});

describe('chunkEvents', () => {
  it('respects the batch size and the body limit', () => {
    const many = Array.from({ length: 250 }, () => ({ kind: 'session' as const, id: `x${++ids}`, session: session() }));
    many.forEach(e => (e.session.id = e.id));
    const chunks = chunkEvents(many);
    expect(chunks.map(c => c.length)).toEqual([100, 100, 50]);
    for (const c of chunks) expect(JSON.stringify({ events: c }).length).toBeLessThan(SYNC_PROTOCOL.maxBody);

    const big = Array.from({ length: 60 }, () => {
      const s = session({ metrics: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`metric_with_long_name_${i}`, i * 1.123456789])) });
      return { kind: 'session' as const, id: s.id, session: s };
    });
    for (const c of chunkEvents(big)) expect(JSON.stringify({ events: c }).length).toBeLessThan(SYNC_PROTOCOL.maxBody);
  });
});

describe('SyncClient', () => {
  it('moves sessions between two devices on one key', async () => {
    const server = new FakeServer();
    const phone = await device(server);
    const laptop = await device(server);

    phone.repository.addSession(session({ id: 'from-phone' }));
    laptop.repository.addSession(session({ id: 'from-laptop' }));
    await phone.client.sync();
    await laptop.client.sync();
    await phone.client.sync();

    for (const d of [phone, laptop]) {
      expect(activeSessions(d.repository.events).map(s => s.id).sort()).toEqual(['from-laptop', 'from-phone']);
      expect(d.repository.snapshot.outbox).toEqual([]);
      expect(d.client.current).toMatchObject({ state: 'idle', pending: 0, lastSyncedAt: clock.wallNow() });
    }
    expect(server.rows).toHaveLength(2);
  });

  it('syncs resets too, so clearing stats on one device clears them everywhere', async () => {
    const server = new FakeServer();
    const a = await device(server);
    const b = await device(server);
    a.repository.addSession(session({ startedAt: 10 }));
    await a.client.sync();
    await b.client.sync();
    expect(activeSessions(b.repository.events)).toHaveLength(1);
    a.repository.reset(null);
    await a.client.sync();
    await b.client.sync();
    expect(activeSessions(b.repository.events)).toHaveLength(0);
  });

  it('waits offline and retries with backoff', async () => {
    const server = new FakeServer();
    server.online = false;
    const d = await device(server);
    d.repository.addSession(session({ id: 'later' }));
    await d.client.sync();
    expect(d.client.current).toMatchObject({ state: 'offline', error: 'network', pending: 1 });

    server.online = true;
    d.scheduler.advance(RETRY_DELAYS_MS[0]);
    await d.client.sync(); // the retry is in flight; wait for it
    expect(d.client.current.state).toBe('idle');
    expect(server.rows.map(r => r.event.id)).toEqual(['later']);
  });

  it('reports HTTP errors as errors, not offline', async () => {
    const server = new FakeServer();
    const d = await device(server, () => 'not-a-key');
    d.repository.addSession(session());
    await d.client.sync();
    expect(d.client.current).toMatchObject({ state: 'error', error: '401' });
  });

  it('does nothing while sync is off', async () => {
    const server = new FakeServer();
    const d = await device(server, () => null);
    d.repository.addSession(session());
    await d.client.sync();
    expect(d.client.current.state).toBe('disabled');
    expect(server.calls).toEqual([]);
  });

  it('syncs after local changes once started (debounced)', async () => {
    const server = new FakeServer();
    const d = await device(server);
    d.client.start();
    d.repository.addSession(session());
    d.repository.addSession(session());
    d.scheduler.advance(1000);
    await d.client.sync();
    expect(server.calls.filter(c => c.startsWith('POST'))).toHaveLength(1);
    expect(server.rows).toHaveLength(2);
    d.client.stop();
  });

  it('pages through large downloads', async () => {
    const server = new FakeServer();
    const a = await device(server);
    for (let i = 0; i < 620; i++) a.repository.addSession(session());
    await a.client.sync();
    const b = await device(server);
    server.calls = [];
    await b.client.sync();
    expect(b.repository.events).toHaveLength(620);
    expect(server.calls.filter(c => c.startsWith('GET'))).toHaveLength(2);
  });

  it('re-uploads everything after switching keys', async () => {
    const server = new FakeServer();
    let key = KEY;
    const d = await device(server, () => key);
    d.repository.addSession(session({ id: 'mine' }));
    await d.client.sync();
    key = 'ZZZZYYYYXXXXWWWWVVVVTTTT';
    d.repository.resetSync();
    await d.client.sync();
    expect(server.rows.filter(r => r.event.id === 'mine').map(r => r.user).sort()).toEqual([KEY, key].sort());
  });

  it('deletes the cloud copy but keeps local data', async () => {
    const server = new FakeServer();
    const d = await device(server);
    d.repository.addSession(session());
    await d.client.sync();
    expect(await d.client.deleteRemote()).toBe(1);
    expect(server.rows).toEqual([]);
    expect(d.repository.events).toHaveLength(1);
  });
});
