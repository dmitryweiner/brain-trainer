// Storage schema v2 (PLAN-IMPROVEMENTS.md, 4.1 and 6.3): an append-only log of
// immutable events with client ids. Everything else (levels, records, XP) is
// derived from it in core/stats, so merging two devices is a set union by id.
// The same sanitizers validate local data and, later, the cloud Worker's input.
import { SCHEMA_VERSION, type GameId, type GameSession } from '../types';

export const GAME_IDS: readonly GameId[] = [
  'reaction-click',
  'color-tap',
  'symbol-match',
  'odd-one-out',
  'hidden-number',
  'memory-flip',
  'sequence-recall',
  'dual-rule-reaction',
  'n-back',
  'logic-pair-concept',
  'phone-recall',
  'emoji-hunt',
  'flags-game',
];

export interface SessionEvent {
  kind: 'session';
  id: string;
  session: GameSession;
}

/** Sessions of `gameId` (or of every game when null) that started at or before `at` no longer count. */
export interface ResetEvent {
  kind: 'reset';
  id: string;
  at: number;
  gameId: GameId | null;
}

/** XP earned under v1 that its history does not explain (carried over by the migration). */
export interface XpEvent {
  kind: 'xp';
  id: string;
  at: number;
  amount: number;
}

export type StoredEvent = SessionEvent | ResetEvent | XpEvent;

export interface StoredDataV2 {
  schemaVersion: typeof SCHEMA_VERSION;
  events: StoredEvent[];
  /** Event ids not yet confirmed by the cloud */
  outbox: string[];
  /** Cloud download cursor */
  cursor: number;
}

export const LIMITS = {
  idLength: 64,
  metrics: 32,
  metricKeyLength: 40,
  /** Upper bound for any stored number: rejects garbage without constraining games */
  maxNumber: 1e13,
} as const;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === 'object' && u !== null && !Array.isArray(u);
}

function isFiniteIn(u: unknown, min: number, max: number): u is number {
  return typeof u === 'number' && Number.isFinite(u) && u >= min && u <= max;
}

export function isEventId(u: unknown): u is string {
  return typeof u === 'string' && ID_RE.test(u);
}

export function isGameId(u: unknown): u is GameId {
  return typeof u === 'string' && (GAME_IDS as readonly string[]).includes(u);
}

function sanitizeMetrics(u: unknown): Record<string, number> | null {
  if (!isRecord(u)) return null;
  const entries = Object.entries(u);
  if (entries.length > LIMITS.metrics) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of entries) {
    if (k.length === 0 || k.length > LIMITS.metricKeyLength) return null;
    if (!isFiniteIn(v, -LIMITS.maxNumber, LIMITS.maxNumber)) return null;
    out[k] = v;
  }
  return out;
}

export function sanitizeSession(u: unknown): GameSession | null {
  if (!isRecord(u)) return null;
  const { id, gameId, schemaVersion, startedAt, durationMs, level, score, rating, accuracy, avgTimeMs } = u;
  const metrics = sanitizeMetrics(u.metrics);
  if (
    !isEventId(id) ||
    !isGameId(gameId) ||
    schemaVersion !== SCHEMA_VERSION ||
    !isFiniteIn(startedAt, 0, LIMITS.maxNumber) ||
    !isFiniteIn(durationMs, 0, LIMITS.maxNumber) ||
    !isFiniteIn(level, 0, 1000) ||
    !isFiniteIn(score, -LIMITS.maxNumber, LIMITS.maxNumber) ||
    !isFiniteIn(rating, 0, 1000) ||
    !isFiniteIn(accuracy, 0, 100) ||
    !isFiniteIn(avgTimeMs, 0, LIMITS.maxNumber) ||
    !metrics
  ) {
    return null;
  }
  return {
    id, gameId, schemaVersion: SCHEMA_VERSION, startedAt, durationMs, level, score, rating, accuracy, avgTimeMs, metrics,
  };
}

export function sanitizeEvent(u: unknown): StoredEvent | null {
  if (!isRecord(u) || !isEventId(u.id)) return null;
  switch (u.kind) {
    case 'session': {
      const session = sanitizeSession(u.session);
      return session && session.id === u.id ? { kind: 'session', id: u.id, session } : null;
    }
    case 'reset':
      if (!isFiniteIn(u.at, 0, LIMITS.maxNumber)) return null;
      if (u.gameId !== null && !isGameId(u.gameId)) return null;
      return { kind: 'reset', id: u.id, at: u.at, gameId: u.gameId };
    case 'xp':
      if (!isFiniteIn(u.at, 0, LIMITS.maxNumber) || !isFiniteIn(u.amount, 0, LIMITS.maxNumber)) return null;
      return { kind: 'xp', id: u.id, at: u.at, amount: u.amount };
    default:
      return null;
  }
}

/** Parses stored v2 data; invalid events are dropped, not fatal. */
export function sanitizeData(u: unknown): StoredDataV2 | null {
  if (!isRecord(u) || u.schemaVersion !== SCHEMA_VERSION || !Array.isArray(u.events)) return null;
  const events: StoredEvent[] = [];
  const seen = new Set<string>();
  for (const raw of u.events) {
    const e = sanitizeEvent(raw);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      events.push(e);
    }
  }
  const outbox = Array.isArray(u.outbox) ? u.outbox.filter(id => isEventId(id) && seen.has(id)) : [];
  const cursor = isFiniteIn(u.cursor, 0, Number.MAX_SAFE_INTEGER) ? u.cursor : 0;
  return { schemaVersion: SCHEMA_VERSION, events, outbox, cursor };
}

export function emptyData(): StoredDataV2 {
  return { schemaVersion: SCHEMA_VERSION, events: [], outbox: [], cursor: 0 };
}
