import { SCHEMA_VERSION, type GameDefinition, type GameSession, type SessionOutcome } from '../types';
import { clampRating } from '../games/registry';

export interface SessionStamp {
  id: string;
  /** epoch ms */
  startedAt: number;
  durationMs: number;
  level: number;
}

const finite = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);

export function buildSession(game: GameDefinition, outcome: SessionOutcome, stamp: SessionStamp): GameSession {
  return {
    id: stamp.id,
    gameId: game.id,
    schemaVersion: SCHEMA_VERSION,
    startedAt: stamp.startedAt,
    durationMs: Math.max(0, Math.round(finite(stamp.durationMs))),
    level: stamp.level,
    score: finite(outcome.score),
    rating: clampRating(game.rating(outcome, stamp.level)),
    accuracy: Math.min(100, Math.max(0, Math.round(finite(outcome.accuracy)))),
    avgTimeMs: Math.max(0, Math.round(finite(outcome.avgTimeMs))),
    metrics: Object.fromEntries(Object.entries(outcome.metrics).filter(([, v]) => Number.isFinite(v))),
  };
}
