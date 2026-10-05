// Worker contract tests in Miniflare (workerd + local D1), like
// ../../synesthesia/cloud. Run with `npm test` (builds dist/index.js first).
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const ORIGIN = 'https://dmitryweiner.github.io';
const KEY_A = 'ABCD0123EFGH4567JKMN89PQ';
const KEY_B = 'ZZZZYYYYXXXXWWWWVVVVTTTT';
let mf;
let db;

function call(path, { key, ...options } = {}) {
  const headers = { Origin: ORIGIN, ...(key ? { Authorization: `Bearer ${key}` } : {}), ...options.headers };
  return mf.dispatchFetch(`https://sync.test${path}`, { ...options, headers });
}

function upload(key, events, extra = {}) {
  return call('/v1/events', {
    key,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extra.headers },
    body: typeof events === 'string' ? events : JSON.stringify({ events }),
  });
}

let n = 0;
function sessionEvent(over = {}) {
  n++;
  const id = over.id ?? `s-${n}`;
  return {
    kind: 'session',
    id,
    session: {
      id, gameId: 'reaction-click', schemaVersion: 2, startedAt: 1_700_000_000_000 + n, durationMs: 5000,
      level: 1, score: 10, rating: 400, accuracy: 80, avgTimeMs: 300, metrics: { bestReactionMs: 250 },
    },
  };
}

before(async () => {
  const script = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
  mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script,
    compatibilityDate: '2026-09-01',
    bindings: { ALLOWED_ORIGINS: `${ORIGIN} http://localhost:5173` },
    d1Databases: ['DB'],
    ratelimits: {
      WRITE_LIMIT: { namespace_id: '1', simple: { limit: 1000, period: 60 } },
      READ_LIMIT: { namespace_id: '2', simple: { limit: 1000, period: 60 } },
    },
  }));
  db = await mf.getD1Database('DB');
  const sql = await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8');
  for (const statement of sql.split('-- statement-breakpoint')) {
    const s = statement.replace(/^\s*--.*$/gm, '').trim();
    if (s) await db.prepare(s).run();
  }
});
after(async () => { await mf?.dispose(); });

test('health needs no key', async () => {
  const res = await call('/v1/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('requires a well-formed key and never stores it', async () => {
  assert.equal((await call('/v1/events')).status, 401);
  assert.equal((await call('/v1/events', { key: 'short' })).status, 401);
  assert.equal((await upload('abcd0123efgh4567jkmn89pq', [])).status, 401, 'keys are sent normalized');

  const ev = sessionEvent();
  assert.equal((await upload(KEY_A, [ev])).status, 200);
  const rows = await db.prepare('SELECT user, body FROM events').all();
  for (const row of rows.results) {
    assert.match(row.user, /^[0-9a-f]{64}$/);
    assert.ok(!row.body.includes(KEY_A));
  }
});

test('upload is idempotent and download pages by cursor', async () => {
  const key = 'K0K0K0K0K0K0K0K0K0K0K0K0';
  const events = Array.from({ length: 3 }, () => sessionEvent());
  const first = await upload(key, events);
  assert.deepEqual(await first.json(), { accepted: events.map(e => e.id), rejected: [] });
  const again = await upload(key, events);
  assert.equal(again.status, 200);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM events WHERE id IN (?, ?, ?)').bind(...events.map(e => e.id)).first()).n, 3);

  const page = await (await call('/v1/events?after=0', { key })).json();
  assert.deepEqual(page.events, events);
  assert.equal(page.more, false);
  const rest = await (await call(`/v1/events?after=${page.cursor}`, { key })).json();
  assert.deepEqual(rest, { events: [], cursor: page.cursor, more: false });
});

test('keys are isolated from each other', async () => {
  const ev = sessionEvent({ id: 'shared-id' });
  await upload(KEY_B, [ev]);
  const other = sessionEvent({ id: 'shared-id' });
  other.session.score = 99;
  await upload('QQQQQQQQQQQQQQQQQQQQQQQQ', [other]);
  const b = await (await call('/v1/events?after=0', { key: KEY_B })).json();
  assert.deepEqual(b.events, [ev]);
  const q = await (await call('/v1/events?after=0', { key: 'QQQQQQQQQQQQQQQQQQQQQQQQ' })).json();
  assert.equal(q.events[0].session.score, 99);
});

test('invalid events are rejected individually, valid ones stored canonically', async () => {
  const key = 'R0R0R0R0R0R0R0R0R0R0R0R0';
  const good = { ...sessionEvent(), junk: '<script>' };
  const bad = { ...sessionEvent(), session: { ...sessionEvent().session, rating: 5000 } };
  const res = await (await upload(key, [good, bad, { kind: 'nope' }])).json();
  assert.deepEqual(res, { accepted: [good.id], rejected: [bad.id] });
  const page = await (await call('/v1/events?after=0', { key })).json();
  assert.equal(page.events.length, 1);
  assert.equal(page.events[0].junk, undefined);
});

test('accepts reset and xp events', async () => {
  const key = 'X0X0X0X0X0X0X0X0X0X0X0X0';
  const events = [
    { kind: 'reset', id: 'r-1', at: 1_700_000_000_000, gameId: null },
    { kind: 'xp', id: 'v1-xp', at: 1, amount: 33 },
  ];
  assert.deepEqual((await (await upload(key, events)).json()).accepted, ['r-1', 'v1-xp']);
});

test('rejects malformed requests', async () => {
  assert.equal((await upload(KEY_A, '{not json')).status, 400);
  assert.equal((await upload(KEY_A, '{"events": 5}')).status, 422);
  assert.equal((await upload(KEY_A, 'x'.repeat(70 * 1024))).status, 413);
  assert.equal((await upload(KEY_A, Array.from({ length: 101 }, () => sessionEvent()))).status, 413);
  assert.equal((await call('/v1/events?after=-1', { key: KEY_A })).status, 400);
  assert.equal((await call('/v1/events', { key: KEY_A, method: 'PUT' })).status, 405);
  assert.equal((await call('/nope')).status, 404);
});

test('download returns at most a page and says there is more', async () => {
  const key = 'P0P0P0P0P0P0P0P0P0P0P0P0';
  for (let i = 0; i < 6; i++) await upload(key, Array.from({ length: 100 }, () => sessionEvent()));
  const first = await (await call('/v1/events?after=0', { key })).json();
  assert.equal(first.events.length, 500);
  assert.equal(first.more, true);
  const second = await (await call(`/v1/events?after=${first.cursor}`, { key })).json();
  assert.equal(second.events.length, 100);
  assert.equal(second.more, false);
});

test('per-key quota blocks new events but not resends', async () => {
  const key = 'F0F0F0F0F0F0F0F0F0F0F0F0';
  const ev = sessionEvent();
  await upload(key, [ev]);
  const [{ user }] = (await db.prepare('SELECT user FROM events WHERE id = ?').bind(ev.id).all()).results;
  await db.prepare('UPDATE users SET events = 50000 WHERE user = ?').bind(user).run();
  assert.equal((await upload(key, [sessionEvent()])).status, 507);
  assert.equal((await upload(key, [ev])).status, 200);
});

test('daily quota answers 429 with Retry-After', async () => {
  const day = Math.floor(Date.now() / 1000 / 86400);
  await db.prepare('INSERT INTO daily VALUES (?, 10000) ON CONFLICT(day) DO UPDATE SET count = 10000').bind(day).run();
  const res = await upload('D0D0D0D0D0D0D0D0D0D0D0D0', [sessionEvent()]);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('Retry-After'), '60');
  await db.prepare('DELETE FROM daily').run();
});

test('deleting the account removes only that key\'s data', async () => {
  const key = 'E0E0E0E0E0E0E0E0E0E0E0E0';
  await upload(key, [sessionEvent(), sessionEvent()]);
  const res = await call('/v1/account', { key, method: 'DELETE' });
  assert.deepEqual(await res.json(), { deleted: 2 });
  assert.deepEqual((await (await call('/v1/events?after=0', { key })).json()).events, []);
  assert.ok((await (await call('/v1/events?after=0', { key: KEY_B })).json()).events.length > 0);
});

test('CORS for allowed origins only', async () => {
  const pre = await call('/v1/events', {
    method: 'OPTIONS',
    headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type' },
  });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.match(pre.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  assert.match(pre.headers.get('Access-Control-Allow-Methods'), /DELETE/);
  const evil = await call('/v1/health', { headers: { Origin: 'https://evil.test' } });
  assert.equal(evil.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(evil.headers.get('Cache-Control'), 'no-store');
});
