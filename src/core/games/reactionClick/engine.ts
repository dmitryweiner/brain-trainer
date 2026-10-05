// Reaction Click: wait for the signal, tap as fast as possible. Tapping before
// the signal is a false start and uses up the attempt.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';

export const REACTION_CLICK = {
  attempts: 5,
  minDelayMs: 1000,
  maxDelayMs: 4000,
  clickedPauseMs: 800,
  falseStartPauseMs: 1000,
} as const;

export type ReactionPhase = 'waiting' | 'ready' | 'clicked' | 'tooEarly' | 'done';

export interface ReactionClickState {
  phase: ReactionPhase;
  /** Attempts used so far */
  attempt: number;
  reactionTimes: number[];
  score: number;
  falseStarts: number;
  /** waiting: when the signal shows; clicked/tooEarly: when the next attempt starts */
  until: number;
  /** When the signal showed (phase 'ready') */
  readyAt: number;
}

export type ReactionClickEvent = { type: 'tap' } | { type: 'go' } | { type: 'next' };

export function reactionPoints(ms: number): number {
  if (ms < 300) return 5;
  if (ms < 500) return 3;
  if (ms < 800) return 2;
  return 1;
}

function waitFor(state: ReactionClickState, ctx: EngineContext): ReactionClickState {
  const delay = ctx.rng.int(REACTION_CLICK.minDelayMs, REACTION_CLICK.maxDelayMs);
  return { ...state, phase: 'waiting', until: ctx.now + delay };
}

export const reactionClickEngine: GameEngine<ReactionClickState, ReactionClickEvent> = {
  init(_level, ctx) {
    return waitFor(
      { phase: 'waiting', attempt: 0, reactionTimes: [], score: 0, falseStarts: 0, until: 0, readyAt: 0 },
      ctx,
    );
  },

  reduce(state, event, ctx) {
    switch (event.type) {
      case 'go':
        return state.phase === 'waiting' ? { ...state, phase: 'ready', readyAt: ctx.now } : state;
      case 'tap':
        if (state.phase === 'waiting') {
          return {
            ...state,
            phase: 'tooEarly',
            attempt: state.attempt + 1,
            falseStarts: state.falseStarts + 1,
            until: ctx.now + REACTION_CLICK.falseStartPauseMs,
          };
        }
        if (state.phase === 'ready') {
          const ms = Math.max(0, Math.round(ctx.now - state.readyAt));
          return {
            ...state,
            phase: 'clicked',
            attempt: state.attempt + 1,
            reactionTimes: [...state.reactionTimes, ms],
            score: state.score + reactionPoints(ms),
            until: ctx.now + REACTION_CLICK.clickedPauseMs,
          };
        }
        return state;
      case 'next':
        if (state.phase !== 'clicked' && state.phase !== 'tooEarly') return state;
        return state.attempt >= REACTION_CLICK.attempts ? { ...state, phase: 'done' } : waitFor(state, ctx);
    }
  },

  timers(state): TimerRequest<ReactionClickEvent>[] {
    if (state.phase === 'waiting') return [{ id: `go-${state.attempt}`, at: state.until, event: { type: 'go' } }];
    if (state.phase === 'clicked' || state.phase === 'tooEarly') {
      return [{ id: `next-${state.attempt}`, at: state.until, event: { type: 'next' } }];
    }
    return [];
  },

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const times = state.reactionTimes;
    const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const metrics: Record<string, number> = { falseStarts: state.falseStarts, hits: times.length };
    if (times.length > 0) {
      metrics.bestReactionMs = Math.min(...times);
      metrics.worstReactionMs = Math.max(...times);
    }
    return {
      score: state.score,
      accuracy: Math.round((times.length / REACTION_CLICK.attempts) * 100),
      avgTimeMs: avg,
      metrics,
    };
  },
};
