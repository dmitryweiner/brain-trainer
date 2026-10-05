// Sync Worker (PLAN-IMPROVEMENTS.md, 6.3): stores each anonymous key's event
// log and hands it to the key's other devices.
//   POST   /v1/events            { events } → { accepted, rejected }
//   GET    /v1/events?after=<n>  → { events, cursor, more }
//   DELETE /v1/account           → { deleted }
//   GET    /v1/health
// Every /v1/events and /v1/account request needs `Authorization: Bearer <key>`.
// Events are validated with the app's own sanitizer (../../src/core, bundled
// by esbuild) and stored as canonical JSON.
import { sanitizeEvent } from '../../src/core/storage/schema';
import { isSyncKey } from '../../src/core/sync/key';
import { SYNC_PROTOCOL, type DeleteResponse, type DownloadResponse, type UploadResponse } from '../../src/core/sync/protocol';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  WRITE_LIMIT: RateLimit;
  READ_LIMIT: RateLimit;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}

async function readBody(req: Request): Promise<string> {
  const max = SYNC_PROTOCOL.maxBody;
  if (Number(req.headers.get('Content-Length')) > max) fail(413, 'body too large');
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      fail(413, 'body too large');
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(all);
}

/** hex SHA-256 of the key: the only form in which a key is stored */
async function userOf(req: Request): Promise<string> {
  const auth = req.headers.get('Authorization') ?? '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!isSyncKey(key)) fail(401, 'missing or malformed sync key');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function limit(rl: RateLimit, key: string): Promise<void> {
  const { success } = await rl.limit({ key });
  if (!success) fail(429, 'too many requests');
}

function clientIp(req: Request): string {
  return req.headers.get('CF-Connecting-IP') ?? 'unknown';
}

async function upload(req: Request, env: Env): Promise<Response> {
  await limit(env.WRITE_LIMIT, clientIp(req));
  const user = await userOf(req);
  let raw: unknown;
  try {
    raw = JSON.parse(await readBody(req));
  } catch (err) {
    if (err instanceof HttpError) throw err;
    fail(400, 'invalid JSON');
  }
  const list = (raw as { events?: unknown } | null)?.events;
  if (!Array.isArray(list)) fail(422, 'expected { events: [...] }');
  if (list.length > SYNC_PROTOCOL.maxBatch) fail(413, `at most ${SYNC_PROTOCOL.maxBatch} events per request`);

  const accepted: string[] = [];
  const rejected: string[] = [];
  const statements: D1PreparedStatement[] = [];
  const now = Date.now() / 1000;
  const insert = env.DB.prepare('INSERT OR IGNORE INTO events (user, id, kind, body, created) VALUES (?, ?, ?, ?, ?)');
  for (const item of list) {
    const event = sanitizeEvent(item);
    if (!event) {
      const id = (item as { id?: unknown } | null)?.id;
      if (typeof id === 'string' && id.length <= 64) rejected.push(id);
      continue;
    }
    accepted.push(event.id);
    statements.push(insert.bind(user, event.id, event.kind, JSON.stringify(event), now));
  }
  if (statements.length > 0) {
    try {
      await env.DB.batch(statements);
    } catch (err) {
      if (String(err).includes('key_quota')) fail(507, 'this sync key is full');
      if (String(err).includes('daily_quota')) fail(429, 'daily sync quota reached, try later');
      throw err;
    }
  }
  return json({ accepted, rejected } satisfies UploadResponse);
}

async function download(req: Request, env: Env): Promise<Response> {
  await limit(env.READ_LIMIT, clientIp(req));
  const user = await userOf(req);
  const afterRaw = new URL(req.url).searchParams.get('after') ?? '0';
  const after = /^\d{1,15}$/.test(afterRaw) ? Number(afterRaw) : fail(400, 'bad cursor');
  const page = SYNC_PROTOCOL.pageSize;
  const { results } = await env.DB
    .prepare('SELECT seq, body FROM events WHERE user = ? AND seq > ? ORDER BY seq LIMIT ?')
    .bind(user, after, page + 1)
    .all<{ seq: number; body: string }>();
  const rows = results.slice(0, page);
  return json({
    events: rows.map(r => JSON.parse(r.body)),
    cursor: rows.length > 0 ? rows[rows.length - 1].seq : after,
    more: results.length > page,
  } satisfies DownloadResponse);
}

async function deleteAccount(req: Request, env: Env): Promise<Response> {
  await limit(env.WRITE_LIMIT, clientIp(req));
  const user = await userOf(req);
  const [res] = await env.DB.batch([
    env.DB.prepare('DELETE FROM events WHERE user = ?').bind(user),
    env.DB.prepare('DELETE FROM users WHERE user = ?').bind(user),
  ]);
  return json({ deleted: res.meta.changes ?? 0 } satisfies DeleteResponse);
}

async function route(req: Request, env: Env): Promise<Response> {
  const path = new URL(req.url).pathname;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (path === '/v1/health' && req.method === 'GET') return json({ ok: true });
  if (path === '/v1/events') {
    if (req.method === 'POST') return upload(req, env);
    if (req.method === 'GET') return download(req, env);
    fail(405, 'method not allowed');
  }
  if (path === '/v1/account') {
    if (req.method === 'DELETE') return deleteAccount(req, env);
    fail(405, 'method not allowed');
  }
  fail(404, 'not found');
}

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || '').split(/\s+/).filter(Boolean);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    let res: Response;
    try {
      res = await route(req, env);
    } catch (err) {
      res = err instanceof HttpError ? json({ detail: err.message }, err.status) : json({ detail: 'temporarily unavailable' }, 503);
    }
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Vary', 'Origin');
    if (res.status === 429) res.headers.set('Retry-After', '60');
    const origin = req.headers.get('Origin');
    if (origin && allowedOrigins(env).includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.headers.set('Access-Control-Max-Age', '86400');
    }
    return res;
  },
} satisfies ExportedHandler<Env>;
