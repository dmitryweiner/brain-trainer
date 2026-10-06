// Fit the piece: a square board has a hole cut out; which of the pieces
// fills it? Pieces may be turned, so the right one is usually shown turned.
// Distractors: its mirror image, near misses, other shapes. The level grows
// the hole (4…6 cells: there are only two trominoes, too few for four
// different options) and the board.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';
import {
  isChiral, mirror, nearMiss, randomChiral, randomPolyomino, rotate, sameUpToRotation, type Cell, type Shape,
} from '../shapes/polyomino';

export const FIT_PIECE = {
  rounds: 10,
  feedbackMs: 900,
  options: 4,
} as const;

export function fitLayout(level: number): { board: number; cells: number } {
  const L = clampLevel(level);
  return { board: L <= 4 ? 4 : 5, cells: L <= 3 ? 4 : L <= 7 ? 5 : 6 };
}

export interface FitRound {
  board: number;
  /** cells of the board that are cut out, as [x, y] */
  hole: Cell[];
  options: Shape[];
  answer: number;
}

function other(hole: Shape, n: number, rng: Rng): Shape {
  for (;;) {
    const s = randomPolyomino(n, rng);
    if (!sameUpToRotation(s, hole)) return s;
  }
}

export function makeFitRound(level: number, rng: Rng): FitRound {
  const L = clampLevel(level);
  const { board, cells } = fitLayout(L);
  let shape: Shape;
  do {
    shape = randomChiral(cells, rng);
  } while (Math.max(...shape.map(c => c[0])) >= board || Math.max(...shape.map(c => c[1])) >= board);
  const w = Math.max(...shape.map(c => c[0])) + 1;
  const h = Math.max(...shape.map(c => c[1])) + 1;
  const ox = rng.int(0, board - w);
  const oy = rng.int(0, board - h);
  const hole = shape.map(([x, y]) => [x + ox, y + oy] as const);

  const distractors: Shape[] = [];
  if (L >= 4 && isChiral(shape)) distractors.push(mirror(shape));
  if (L >= 6) {
    const near = nearMiss(shape, rng);
    if (near) distractors.push(near);
  }
  for (let attempt = 0; distractors.length < FIT_PIECE.options - 1; attempt++) {
    const d = other(shape, cells, rng);
    // prefer distinct distractors, but never loop forever
    if (attempt > 50 || !distractors.some(x => sameUpToRotation(x, d))) distractors.push(d);
  }
  const answerShape = rotate(shape, L <= 2 ? 0 : rng.int(1, 3));
  const options = rng.shuffle([answerShape, ...distractors.map(d => rotate(d, rng.int(0, 3)))]);
  return { board, hole, options, answer: options.findIndex(o => sameUpToRotation(o, shape)) };
}

export interface FitPieceState {
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

export type FitPieceEvent = { type: 'pick'; index: number } | { type: 'next' };

export const fitPieceEngine: GameEngine<FitPieceState, FitPieceEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    return {
      phase: 'playing', level: L, round: 0, current: makeFitRound(L, ctx.rng), roundStartedAt: ctx.now,
      answers: [], picked: null, score: 0, until: 0,
    };
  },

  reduce(state, event, ctx) {
    if (event.type === 'next') {
      if (state.phase !== 'feedback') return state;
      if (state.round >= FIT_PIECE.rounds) return { ...state, phase: 'done' };
      return { ...state, phase: 'playing', current: makeFitRound(state.level, ctx.rng), roundStartedAt: ctx.now, picked: null };
    }
    if (state.phase !== 'playing' || event.index < 0 || event.index >= state.current.options.length) return state;
    const correct = event.index === state.current.answer;
    return {
      ...state,
      phase: 'feedback',
      round: state.round + 1,
      picked: event.index,
      answers: [...state.answers, { correct, timeMs: elapsed(ctx.now, state.roundStartedAt) }],
      score: state.score + (correct ? state.current.hole.length : 0),
      until: ctx.now + FIT_PIECE.feedbackMs,
    };
  },

  timers(state): TimerRequest<FitPieceEvent>[] {
    return state.phase === 'feedback' ? [{ id: `next-${state.round}`, at: state.until, event: { type: 'next' } }] : [];
  },

  cues: counterCues<FitPieceState>(s => s.answers.filter(a => a.correct).length, s => s.answers.filter(a => !a.correct).length),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const correct = state.answers.filter(a => a.correct).length;
    return {
      score: state.score,
      accuracy: percent(correct, state.answers.length),
      avgTimeMs: average(state.answers.map(a => a.timeMs)),
      metrics: { correct, rounds: state.answers.length, cells: fitLayout(state.level).cells },
    };
  },
};

/** Accuracy × speed (≤3 s full, ≥10 s 60%) × the level's ceiling */
export function fitPieceRating(outcome: SessionOutcome, level: number): number {
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 3000, 10000, 0.6) * levelCeiling(level);
}
