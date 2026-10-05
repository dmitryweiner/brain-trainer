// Odd One Out: a grid of identical emoji with one look-alike; tap the odd one.
// The grid grows with the round: 3×3, then 4×4, then 5×5.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import { ODD_ONE_OUT_EMOJIS, type OddOneOutDifficulty } from './data';

export const ODD_ONE_OUT = {
  rounds: 10,
  feedbackMs: 800,
} as const;

export interface OddOneOutRoundResult {
  correct: boolean;
  timeMs: number;
  difficulty: OddOneOutDifficulty;
}

export interface OddOneOutState {
  phase: 'playing' | 'feedback' | 'done';
  /** Rounds answered so far */
  round: number;
  difficulty: OddOneOutDifficulty;
  gridSize: number;
  grid: string[];
  oddIndex: number;
  roundStartedAt: number;
  results: OddOneOutRoundResult[];
  score: number;
  lastCorrect: boolean | null;
  /** phase 'feedback': when the next round starts */
  until: number;
}

export type OddOneOutEvent = { type: 'pick'; index: number } | { type: 'next' };

export function difficultyForRound(round: number): OddOneOutDifficulty {
  if (round < 3) return 'easy';
  if (round < 7) return 'medium';
  return 'hard';
}

function dealRound(state: OddOneOutState, ctx: EngineContext): OddOneOutState {
  const difficulty = difficultyForRound(state.round);
  const { gridSize, sets } = ODD_ONE_OUT_EMOJIS[difficulty];
  const set = ctx.rng.pick(sets);
  const oddIndex = ctx.rng.int(0, gridSize * gridSize - 1);
  const grid = Array.from({ length: gridSize * gridSize }, (_, i) => (i === oddIndex ? set.odd : set.main));
  return { ...state, phase: 'playing', difficulty, gridSize, grid, oddIndex, roundStartedAt: ctx.now };
}

export const oddOneOutEngine: GameEngine<OddOneOutState, OddOneOutEvent> = {
  init(_level, ctx) {
    return dealRound(
      {
        phase: 'playing', round: 0, difficulty: 'easy', gridSize: 3, grid: [], oddIndex: 0,
        roundStartedAt: 0, results: [], score: 0, lastCorrect: null, until: 0,
      },
      ctx,
    );
  },

  reduce(state, event, ctx) {
    if (event.type === 'pick') {
      if (state.phase !== 'playing' || event.index < 0 || event.index >= state.grid.length) return state;
      const correct = event.index === state.oddIndex;
      return {
        ...state,
        phase: 'feedback',
        round: state.round + 1,
        results: [
          ...state.results,
          { correct, timeMs: Math.max(0, Math.round(ctx.now - state.roundStartedAt)), difficulty: state.difficulty },
        ],
        // More points for larger grids: 3 for 3×3 … 5 for 5×5
        score: state.score + (correct ? state.gridSize : 0),
        lastCorrect: correct,
        until: ctx.now + ODD_ONE_OUT.feedbackMs,
      };
    }
    if (state.phase !== 'feedback') return state;
    return state.round >= ODD_ONE_OUT.rounds ? { ...state, phase: 'done' } : dealRound(state, ctx);
  },

  timers(state): TimerRequest<OddOneOutEvent>[] {
    return state.phase === 'feedback' ? [{ id: `next-${state.round}`, at: state.until, event: { type: 'next' } }] : [];
  },

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const { results } = state;
    const correct = results.filter(r => r.correct).length;
    const avg = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.timeMs, 0) / results.length) : 0;
    return {
      score: state.score,
      accuracy: results.length > 0 ? Math.round((correct / results.length) * 100) : 0,
      avgTimeMs: avg,
      metrics: { correct, rounds: results.length, maxGridSize: state.gridSize },
    };
  },
};
