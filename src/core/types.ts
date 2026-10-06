// Shared domain types of the core layer (PLAN-IMPROVEMENTS.md, 4.1 and 5.2).
// Nothing here may depend on React or the browser.
import type { Rng } from './rng';

export type GameId =
  | 'reaction-click'
  | 'color-tap'
  | 'symbol-match'
  | 'odd-one-out'
  | 'hidden-number'
  | 'memory-flip'
  | 'sequence-recall'
  | 'dual-rule-reaction'
  | 'n-back'
  | 'logic-pair-concept'
  | 'phone-recall'
  | 'emoji-hunt'
  | 'flags-game'
  // stage 4
  | 'memory-matrix'
  | 'schulte'
  | 'whack-a-mole'
  | 'trace-line'
  | 'rotate-shape';

export type GameCategory = 'memory' | 'attention' | 'reaction' | 'spatial' | 'knowledge';

export const SCHEMA_VERSION = 2;

/** One finished play of one game. Immutable once recorded. */
export interface GameSession {
  id: string;
  gameId: GameId;
  schemaVersion: typeof SCHEMA_VERSION;
  /** epoch ms */
  startedAt: number;
  durationMs: number;
  /** Level the session was played at */
  level: number;
  /** Raw game points, as the game counts them */
  score: number;
  /** 0–1000, comparable across sessions and games */
  rating: number;
  /** 0–100 */
  accuracy: number;
  avgTimeMs: number;
  /** Game-specific numbers: bestReactionMs, gridSize, maxSequence… */
  metrics: Record<string, number>;
}

/** What an engine reports at the end; the shell adds id, times, level and rating. */
export interface SessionOutcome {
  score: number;
  accuracy: number;
  avgTimeMs: number;
  metrics: Record<string, number>;
}

export interface EngineContext {
  /** Monotonic-enough clock in ms, supplied by the platform Scheduler */
  now: number;
  rng: Rng;
}

/** A timeout the engine wants while it is in the current state. */
export interface TimerRequest<E> {
  /** Stable key: the same id with the same `at` keeps the running timer */
  id: string;
  /** Absolute time (same clock as EngineContext.now) */
  at: number;
  event: E;
}

/**
 * A game as a deterministic state machine. Timers are declared, not started:
 * the runner (core/engine/runner.ts) owns them through the platform Scheduler.
 */
export interface GameEngine<S, E> {
  /** `variant`: a choice made on the intro screen (e.g. the Flags quiz direction) */
  init(level: number, ctx: EngineContext, variant?: string): S;
  reduce(state: S, event: E, ctx: EngineContext): S;
  timers(state: S): TimerRequest<E>[];
  isFinished(state: S): boolean;
  result(state: S): SessionOutcome;
}

export interface GameDefinition {
  id: GameId;
  category: GameCategory;
  icon: string;
  /** 1–5 stars shown on the card */
  difficulty: number;
  minLevel: number;
  maxLevel: number;
  sessionKind: 'rounds' | 'timed';
  /** Max raw score of the v1 game: normalizes v1 history and not-yet-ported games */
  legacyMaxScore: number;
  /** Pure: outcome at a level → 0..1000 */
  rating(outcome: SessionOutcome, level: number): number;
  /**
   * The level a stored session effectively counts as. Sessions from before
   * the game had levels record level 1 but were played at a fixed difficulty.
   */
  sessionLevel?(session: GameSession): number;
  /** Present once the game runs on the engine; otherwise its v1 component owns the loop */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engines are heterogeneous; the shell treats state as opaque
  engine?: GameEngine<any, any>;
}
