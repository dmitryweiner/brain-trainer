// N-Back, positional: a cell of a 3×3 grid lights up every few seconds; press
// "match" when it is the same cell as N steps back. 90 s per session. The
// level sets N (1–3) and the pace.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { clampLevel, counterCues, levelCeiling, percent } from '../common';

export const N_BACK = {
  sessionMs: 90_000,
  cells: 9,
  litMs: 900,
  targetRate: 0.3,
  leadInMs: 1000,
} as const;

export function nBackLayout(level: number): { n: number; intervalMs: number; trials: number } {
  const L = clampLevel(level);
  const n = L <= 3 ? 1 : L <= 7 ? 2 : 3;
  const intervalMs = Math.max(1800, 2600 - 60 * (L - 1));
  return { n, intervalMs, trials: Math.floor(N_BACK.sessionMs / intervalMs) };
}

/** Positions with about 30% targets after the first N; a non-target never repeats the N-back cell */
export function nBackSequence(n: number, trials: number, rng: Rng): number[] {
  const seq: number[] = [];
  for (let i = 0; i < trials; i++) {
    if (i >= n && rng.next() < N_BACK.targetRate) {
      seq.push(seq[i - n]);
    } else {
      let cell = rng.int(0, N_BACK.cells - 1);
      while (i >= n && cell === seq[i - n]) cell = rng.int(0, N_BACK.cells - 1);
      seq.push(cell);
    }
  }
  return seq;
}

export interface NBackState {
  phase: 'leadIn' | 'playing' | 'done';
  level: number;
  n: number;
  intervalMs: number;
  sequence: number[];
  index: number;
  lit: boolean;
  shownAt: number;
  responded: boolean;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  /** the last scored trial, for feedback on the button */
  last: 'hit' | 'miss' | 'falseAlarm' | null;
}

export type NBackEvent = { type: 'match' } | { type: 'unlight' } | { type: 'advance' };

export function isTarget(state: Pick<NBackState, 'sequence' | 'index' | 'n'>, index = state.index): boolean {
  return index >= state.n && state.sequence[index] === state.sequence[index - state.n];
}

/** Scores the trial that is ending */
function score(state: NBackState): NBackState {
  if (state.index < state.n) return state;
  const target = isTarget(state);
  if (target && state.responded) return state; // counted as a hit on the press
  if (target) return { ...state, misses: state.misses + 1, last: 'miss' };
  if (state.responded) return state; // counted as a false alarm on the press
  return { ...state, correctRejections: state.correctRejections + 1 };
}

export const nBackEngine: GameEngine<NBackState, NBackEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const { n, intervalMs, trials } = nBackLayout(L);
    return {
      phase: 'leadIn', level: L, n, intervalMs, sequence: nBackSequence(n, trials, ctx.rng), index: -1, lit: false,
      shownAt: ctx.now, responded: false, hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0, last: null,
    };
  },

  reduce(state, event, ctx) {
    if (state.phase === 'done') return state;
    switch (event.type) {
      case 'match': {
        if (state.phase !== 'playing' || state.responded || state.index < state.n) return state;
        return isTarget(state)
          ? { ...state, responded: true, hits: state.hits + 1, last: 'hit' }
          : { ...state, responded: true, falseAlarms: state.falseAlarms + 1, last: 'falseAlarm' };
      }
      case 'unlight':
        return { ...state, lit: false };
      case 'advance': {
        const scored = state.phase === 'playing' ? score(state) : state;
        const index = state.index + 1;
        if (index >= state.sequence.length) return { ...scored, phase: 'done', lit: false };
        return { ...scored, phase: 'playing', index, lit: true, shownAt: ctx.now, responded: false };
      }
    }
  },

  timers(state): TimerRequest<NBackEvent>[] {
    if (state.phase === 'done') return [];
    if (state.phase === 'leadIn') return [{ id: 'leadIn', at: state.shownAt + N_BACK.leadInMs, event: { type: 'advance' } }];
    const timers: TimerRequest<NBackEvent>[] = [
      { id: `advance-${state.index}`, at: state.shownAt + state.intervalMs, event: { type: 'advance' } },
    ];
    if (state.lit) timers.push({ id: `unlight-${state.index}`, at: state.shownAt + N_BACK.litMs, event: { type: 'unlight' } });
    return timers;
  },

  cues: counterCues<NBackState>(s => s.hits, s => s.falseAlarms + s.misses),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const { hits, misses, falseAlarms, correctRejections } = state;
    const scored = hits + misses + falseAlarms + correctRejections;
    return {
      score: hits * state.n,
      accuracy: percent(hits + correctRejections, scored),
      avgTimeMs: 0,
      metrics: { n: state.n, hits, misses, falseAlarms, correctRejections },
    };
  },
};

/** Level that v1 sessions (emoji 2-back) correspond to */
export const V1_EQUIVALENT_LEVEL = 4;
const V1_MAX_SCORE = 45;

export function nBackSessionLevel(session: { level: number; metrics: Record<string, number> }): number {
  return session.metrics.n === undefined ? V1_EQUIVALENT_LEVEL : session.level;
}

/**
 * Hit rate minus false-alarm rate (pressing on every step scores 0) × the
 * level's ceiling.
 */
export function nBackRating(outcome: SessionOutcome, level: number): number {
  const m = outcome.metrics;
  if (m.n === undefined) return (outcome.score / V1_MAX_SCORE) * levelCeiling(level);
  const hitRate = m.hits + m.misses > 0 ? m.hits / (m.hits + m.misses) : 0;
  const faRate = m.falseAlarms + m.correctRejections > 0 ? m.falseAlarms / (m.falseAlarms + m.correctRejections) : 0;
  return Math.max(0, hitRate - faRate) * levelCeiling(level);
}
