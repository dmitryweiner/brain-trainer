// Trace the line: drag from the start along the curve to its end without
// leaving the corridor. Three curves per session; the level picks the kind
// of curve and narrows the corridor.
import type { GameEngine, SessionOutcome, TimerRequest } from '../../types';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent } from '../common';
import { corridor, makePath, project, type Pt, type TracePath } from './geometry';

export const TRACE = {
  rounds: 3,
  // grid routes are long: a minute per curve
  roundMs: 60_000,
  feedbackMs: 900,
  /** How far ahead of the reached point a move may land and still count */
  lookahead: 12,
} as const;

export interface TraceRound {
  insideSamples: number;
  samples: number;
  completed: boolean;
  timeMs: number;
}

export interface TraceState {
  phase: 'playing' | 'feedback' | 'done';
  level: number;
  halfWidth: number;
  round: number;
  path: TracePath;
  /** Arc length reached */
  progress: number;
  tracing: boolean;
  /** Where the finger is now (null when lifted) */
  pointer: Pt | null;
  pointerInside: boolean;
  insideSamples: number;
  samples: number;
  roundStartedAt: number;
  firstTouchAt: number | null;
  results: TraceRound[];
  score: number;
  until: number;
}

export type TraceEvent =
  | { type: 'down'; x: number; y: number }
  | { type: 'move'; x: number; y: number }
  | { type: 'up' }
  | { type: 'timeout'; round: number }
  | { type: 'next' };

function startRound(state: TraceState, now: number, path: TracePath): TraceState {
  return {
    ...state, phase: 'playing', path, progress: 0, tracing: false, pointer: null, pointerInside: false,
    insideSamples: 0, samples: 0, roundStartedAt: now, firstTouchAt: null,
  };
}

function endRound(state: TraceState, now: number, completed: boolean): TraceState {
  const result: TraceRound = {
    insideSamples: state.insideSamples,
    samples: state.samples,
    completed,
    timeMs: elapsed(now, state.firstTouchAt ?? state.roundStartedAt),
  };
  const inside = percent(state.insideSamples, state.samples);
  return {
    ...state,
    phase: 'feedback',
    round: state.round + 1,
    tracing: false,
    pointer: null,
    results: [...state.results, result],
    // up to 10 points a curve: how much of it was traced, and how cleanly
    score: state.score + Math.round(((state.progress / state.path.length) * inside) / 10),
    until: now + TRACE.feedbackMs,
  };
}

function track(state: TraceState, p: Pt, now: number): TraceState {
  const near = project(state.path, p, Math.max(0, state.progress - TRACE.lookahead), state.progress + TRACE.lookahead);
  const inside = near.dist <= state.halfWidth;
  const next: TraceState = {
    ...state,
    pointer: p,
    pointerInside: inside,
    samples: state.samples + 1,
    insideSamples: state.insideSamples + (inside ? 1 : 0),
    progress: inside ? Math.max(state.progress, near.along) : state.progress,
  };
  return next.progress >= next.path.length - state.halfWidth ? endRound({ ...next, progress: next.path.length }, now, true) : next;
}

export const traceEngine: GameEngine<TraceState, TraceEvent> = {
  init(level, ctx) {
    const L = clampLevel(level);
    const base: TraceState = {
      phase: 'playing', level: L, halfWidth: corridor(L), round: 0, path: makePath(L, ctx.rng), progress: 0,
      tracing: false, pointer: null, pointerInside: false, insideSamples: 0, samples: 0,
      roundStartedAt: ctx.now, firstTouchAt: null, results: [], score: 0, until: 0,
    };
    return startRound(base, ctx.now, base.path);
  },

  reduce(state, event, ctx) {
    const { now } = ctx;
    if (event.type === 'next') {
      if (state.phase !== 'feedback') return state;
      return state.round >= TRACE.rounds ? { ...state, phase: 'done' } : startRound(state, now, makePath(state.level, ctx.rng));
    }
    if (state.phase !== 'playing') return state;
    switch (event.type) {
      case 'timeout':
        return event.round === state.round ? endRound(state, now, false) : state;
      case 'down': {
        // start at the beginning, or pick up again where the finger left the curve
        const resume = project(state.path, event, Math.max(0, state.progress - TRACE.lookahead), state.progress + TRACE.lookahead);
        if (resume.dist > state.halfWidth * 1.5) return { ...state, pointer: event, pointerInside: false };
        return track({ ...state, tracing: true, firstTouchAt: state.firstTouchAt ?? now }, event, now);
      }
      case 'move':
        return state.tracing ? track(state, event, now) : state;
      case 'up':
        return { ...state, tracing: false, pointer: null };
    }
  },

  timers(state): TimerRequest<TraceEvent>[] {
    if (state.phase === 'playing') {
      return [{ id: `timeout-${state.round}`, at: state.roundStartedAt + TRACE.roundMs, event: { type: 'timeout', round: state.round } }];
    }
    return state.phase === 'feedback' ? [{ id: `next-${state.round}`, at: state.until, event: { type: 'next' } }] : [];
  },

  cues: counterCues<TraceState>(s => s.results.filter(r => r.completed).length, s => s.results.filter(r => !r.completed).length),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const samples = state.results.reduce((a, r) => a + r.samples, 0);
    const inside = state.results.reduce((a, r) => a + r.insideSamples, 0);
    const completed = state.results.filter(r => r.completed);
    return {
      score: state.score,
      accuracy: percent(inside, samples),
      avgTimeMs: average(completed.map(r => r.timeMs)),
      metrics: { completed: completed.length, rounds: state.results.length, corridor: Math.round(state.halfWidth * 10) / 10 },
    };
  },
};

/**
 * Share of the trace inside the corridor × share of curves finished × the
 * level's ceiling. No speed term: the time mostly reflects the route's length.
 */
export function traceRating(outcome: SessionOutcome, level: number): number {
  const finished = outcome.metrics.rounds > 0 ? outcome.metrics.completed / outcome.metrics.rounds : 0;
  return (outcome.accuracy / 100) * finished * levelCeiling(level);
}
