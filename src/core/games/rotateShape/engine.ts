// "Fit the shape" (game id rotate-shape): which piece fills the hole cut out
// of a square? The pieces are shown turned, so each must be turned in the
// mind to try it. Players preferred this to alternating "turn" and "fit"
// rounds (2026-10-09). The level adds cells and makes distractors closer
// (fitPiece/engine).
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';
import { key, rotate, sameUpToRotation, type Shape } from '../shapes/polyomino';
import { makeFitRound, type FitRound } from '../fitPiece/engine';

export const ROTATE_SHAPE = {
  rounds: 12,
  feedbackMs: 700,
  options: 4,
} as const;

export function cellsFor(level: number): number {
  const L = clampLevel(level);
  return L <= 3 ? 4 : L <= 7 ? 5 : 6;
}

/** The shape turned so that the turn shows (a 180°-symmetric shape cannot use 180°) */
export function visibleTurn(shape: Shape, rng: Rng): Shape {
  const turns = rng.shuffle([1, 2, 3]);
  for (const k of turns) {
    const turned = rotate(shape, k);
    if (key(turned) !== key(shape)) return turned;
  }
  return rotate(shape, turns[0]);
}

/** A fit round whose every option is shown turned against the hole */
export function makeTurnedFitRound(level: number, rng: Rng): FitRound {
  const round = makeFitRound(level, rng);
  const hole = round.hole.map(([x, y]) => [x, y] as const);
  const options = round.options.map((o, i) => (i === round.answer ? visibleTurn(hole, rng) : visibleTurn(o, rng)));
  return { ...round, options, answer: options.findIndex(o => sameUpToRotation(o, hole)) };
}

export interface RotateShapeState {
  phase: 'playing' | 'feedback' | 'done';
  level: number;
  round: number;
  current: FitRound;
  roundStartedAt: number;
  answers: { correct: boolean; timeMs: number }[];
  picked: number | null;
  score: number;
  until: number;
}

export type RotateShapeEvent = { type: 'pick'; index: number } | { type: 'next' };

export const rotateShapeEngine: GameEngine<RotateShapeState, RotateShapeEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    return {
      phase: 'playing', level: L, round: 0, current: makeTurnedFitRound(L, ctx.rng), roundStartedAt: ctx.now,
      answers: [], picked: null, score: 0, until: 0,
    };
  },

  reduce(state, event, ctx) {
    if (event.type === 'next') {
      if (state.phase !== 'feedback') return state;
      if (state.round >= ROTATE_SHAPE.rounds) return { ...state, phase: 'done' };
      return {
        ...state, phase: 'playing', current: makeTurnedFitRound(state.level, ctx.rng),
        roundStartedAt: ctx.now, picked: null,
      };
    }
    if (state.phase !== 'playing' || event.index < 0 || event.index >= state.current.options.length) return state;
    const correct = event.index === state.current.answer;
    return {
      ...state,
      phase: 'feedback',
      round: state.round + 1,
      picked: event.index,
      answers: [...state.answers, { correct, timeMs: elapsed(ctx.now, state.roundStartedAt) }],
      score: state.score + (correct ? cellsFor(state.level) : 0),
      until: ctx.now + ROTATE_SHAPE.feedbackMs,
    };
  },

  timers(state): TimerRequest<RotateShapeEvent>[] {
    return state.phase === 'feedback' ? [{ id: `next-${state.round}`, at: state.until, event: { type: 'next' } }] : [];
  },

  cues: counterCues<RotateShapeState>(s => s.answers.filter(a => a.correct).length, s => s.answers.filter(a => !a.correct).length),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const correct = state.answers.filter(a => a.correct).length;
    return {
      score: state.score,
      accuracy: percent(correct, state.answers.length),
      avgTimeMs: average(state.answers.map(a => a.timeMs)),
      metrics: { correct, rounds: state.answers.length, cells: cellsFor(state.level) },
    };
  },
};

/** Accuracy × speed (≤3 s full, ≥10 s 60%) × the level's ceiling */
export function rotateShapeRating(outcome: SessionOutcome, level: number): number {
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 3000, 10000, 0.6) * levelCeiling(level);
}
