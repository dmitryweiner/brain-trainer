// Odd One Out: a grid of identical emoji with one look-alike; tap the odd one.
// The level (1–10) sets the grid size and how alike the pair is; within a
// session the grid grows by one halfway and the pairs get closer at the end.
import type { EngineContext, GameEngine, GameSession, SessionOutcome, TimerRequest } from '../../types';
import { ODD_ONE_OUT_EMOJIS, type OddOneOutDifficulty } from './data';
import { levelCeiling, speedFactor } from '../common';

export const ODD_ONE_OUT = {
  rounds: 10,
  feedbackMs: 800,
  minLevel: 1,
  maxLevel: 10,
  /** metrics.rules of sessions played with level-based layout (stage 1 sessions lack it) */
  rules: 2,
} as const;

export interface OddOneOutRoundResult {
  correct: boolean;
  timeMs: number;
  difficulty: OddOneOutDifficulty;
  gridSize: number;
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
  level: number;
}

export type OddOneOutEvent = { type: 'pick'; index: number } | { type: 'next' };

const TIERS: readonly OddOneOutDifficulty[] = ['easy', 'medium', 'hard'];

/** Largest grid: on a 360 px phone a 6×6 grid keeps cells at the 48 px touch minimum */
export const MAX_GRID = 6;

/** Grid side for a round: 3 at levels 1–3, 4 at 4–6, 5 at 7–9, 6 at 10; one more in the second half. */
export function gridSizeFor(level: number, round: number): number {
  return Math.min(MAX_GRID, 3 + Math.floor((level - 1) / 3) + (round >= ODD_ONE_OUT.rounds / 2 ? 1 : 0));
}

/** How alike the pair is: one tier per three levels, one tier harder in the last three rounds. */
export function difficultyFor(level: number, round: number): OddOneOutDifficulty {
  const tier = Math.floor((level - 1) / 3) + (round >= ODD_ONE_OUT.rounds - 3 ? 1 : 0);
  return TIERS[Math.min(TIERS.length - 1, tier)];
}

function dealRound(state: OddOneOutState, ctx: EngineContext): OddOneOutState {
  const difficulty = difficultyFor(state.level, state.round);
  const gridSize = gridSizeFor(state.level, state.round);
  const { sets } = ODD_ONE_OUT_EMOJIS[difficulty];
  const set = ctx.rng.pick(sets);
  const oddIndex = ctx.rng.int(0, gridSize * gridSize - 1);
  const grid = Array.from({ length: gridSize * gridSize }, (_, i) => (i === oddIndex ? set.odd : set.main));
  return { ...state, phase: 'playing', difficulty, gridSize, grid, oddIndex, roundStartedAt: ctx.now };
}

export const oddOneOutEngine: GameEngine<OddOneOutState, OddOneOutEvent> = {
  init(level, ctx) {
    const clamped = Math.min(ODD_ONE_OUT.maxLevel, Math.max(ODD_ONE_OUT.minLevel, Math.round(level)));
    return dealRound(
      {
        phase: 'playing', round: 0, difficulty: 'easy', gridSize: 3, grid: [], oddIndex: 0,
        roundStartedAt: 0, results: [], score: 0, lastCorrect: null, until: 0, level: clamped,
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
          {
            correct,
            timeMs: Math.max(0, Math.round(ctx.now - state.roundStartedAt)),
            difficulty: state.difficulty,
            gridSize: state.gridSize,
          },
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
      metrics: { correct, rounds: results.length, maxGridSize: state.gridSize, rules: ODD_ONE_OUT.rules },
    };
  },
};

/** Level that v1 and stage-1 sessions (no metrics.rules) correspond to: 3×3→5×5, pairs easy→hard */
export const V1_EQUIVALENT_LEVEL = 4;
/** Raw-score maximum of the v1 game (3·3 + 4·4 + 3·5) */
const V1_MAX_SCORE = 40;

export { levelCeiling };

/** Answers within 1.5 s count fully; slower ones down to 70% at 5 s. */
const speed = (avgTimeMs: number) => speedFactor(avgTimeMs, 1500, 5000, 0.7);

/** Sessions before levels were played at the v1 layout, whatever level they record */
export function oddOneOutSessionLevel(session: GameSession): number {
  return session.metrics.rules === ODD_ONE_OUT.rules ? session.level : V1_EQUIVALENT_LEVEL;
}

/** `level` is the effective level (oddOneOutSessionLevel for stored sessions) */
export function oddOneOutRating(outcome: SessionOutcome, level: number): number {
  // v1 history has no metrics: put its raw score on the scale of the level it was played at
  if (outcome.metrics.correct === undefined) {
    return (outcome.score / V1_MAX_SCORE) * levelCeiling(level);
  }
  return (outcome.accuracy / 100) * levelCeiling(level) * speed(outcome.avgTimeMs);
}
