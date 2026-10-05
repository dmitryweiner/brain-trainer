// v1 → v2 (PLAN-IMPROVEMENTS.md, 4.1). v1 kept a list of
// { gameId, score, accuracy, averageTime, timestamp } and a separate running
// total. Each record becomes a level-1 GameSession rated against the game's
// known maximum; XP the history does not explain becomes one 'xp' event.
// Pure: ids are derived from the record, so re-running gives the same result.
import { SCHEMA_VERSION, type GameId, type GameSession } from '../types';
import { emptyData, isGameId, type StoredDataV2, type StoredEvent } from './schema';

export const STORAGE_KEYS = {
  v2: 'brain-trainer-data-v2',
  /** A v2 value that failed to parse is moved here instead of being overwritten */
  v2Corrupt: 'brain-trainer-data-v2-corrupt',
  v1Results: 'brain-trainer-results',
  v1TotalScore: 'brain-trainer-score',
} as const;

function num(u: unknown, fallback = 0): number {
  return typeof u === 'number' && Number.isFinite(u) ? u : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function migrateV1(
  v1Results: unknown,
  v1TotalScore: unknown,
  ratingFor: (gameId: GameId, score: number) => number,
): StoredDataV2 {
  const data = emptyData();
  const records = Array.isArray(v1Results) ? v1Results : [];
  let scoreSum = 0;
  records.forEach((r: unknown, index) => {
    if (typeof r !== 'object' || r === null) return;
    const rec = r as Record<string, unknown>;
    if (!isGameId(rec.gameId)) return;
    const timestamp = num(rec.timestamp);
    if (timestamp <= 0) return;
    const score = Math.max(0, num(rec.score));
    const session: GameSession = {
      id: `v1-${timestamp.toString(36)}-${index}`,
      gameId: rec.gameId,
      schemaVersion: SCHEMA_VERSION,
      // v1 stamped the end of the game and did not track its length
      startedAt: timestamp,
      durationMs: 0,
      level: 1,
      score,
      rating: clamp(Math.round(ratingFor(rec.gameId, score)), 0, 1000),
      accuracy: clamp(num(rec.accuracy), 0, 100),
      avgTimeMs: Math.max(0, num(rec.averageTime)),
      metrics: {},
    };
    scoreSum += score;
    data.events.push({ kind: 'session', id: session.id, session });
  });
  const extraXp = Math.round(Math.max(0, num(v1TotalScore) - scoreSum) * 10) / 10;
  if (extraXp > 0) {
    const at = data.events.length > 0 ? Math.min(...data.events.map(e => (e as { session: GameSession }).session.startedAt)) : 1;
    data.events.push({ kind: 'xp', id: 'v1-xp', at, amount: extraXp } satisfies StoredEvent);
  }
  data.outbox = data.events.map(e => e.id);
  return data;
}
