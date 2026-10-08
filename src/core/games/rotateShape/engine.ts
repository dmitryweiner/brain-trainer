// "Turn & fit" (game id rotate-shape): two kinds of rounds, mixed half and
// half (players found the two games more fun together, 2026-10-08):
// - turn: which option is the target turned by 90/180/270°? The others are
//   mirror images and different shapes;
// - fit: which piece fills the hole cut out of a square (fitPiece/engine).
// The level adds cells and makes distractors closer.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';
import { key, mirror, nearMiss, randomChiral, rotate, sameUpToRotation, type Shape } from '../shapes/polyomino';
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

export interface RotateRound {
  kind: 'rotate';
  target: Shape;
  options: Shape[];
  answer: number;
}

export type ShapeRound = RotateRound | ({ kind: 'fit' } & FitRound);

/** A turn that visibly changes the shape (a 180°-symmetric shape cannot use 180°) */
function visibleTurn(shape: Shape, rng: Rng): Shape {
  const turns = rng.shuffle([1, 2, 3]);
  for (const k of turns) {
    const turned = rotate(shape, k);
    if (key(turned) !== key(shape)) return turned;
  }
  return rotate(shape, turns[0]);
}

function otherShape(target: Shape, n: number, rng: Rng): Shape {
  for (;;) {
    const s = randomChiral(n, rng);
    if (!sameUpToRotation(s, target) && !sameUpToRotation(s, mirror(target))) return s;
  }
}

export function makeRound(level: number, rng: Rng): RotateRound {
  const L = clampLevel(level);
  const n = cellsFor(L);
  const target = randomChiral(n, rng);
  const mirrors = L <= 3 ? 1 : 2;
  const distractors: Shape[] = [];
  for (let i = 0; i < mirrors; i++) distractors.push(rotate(mirror(target), rng.int(0, 3)));
  while (distractors.length < ROTATE_SHAPE.options - 1) {
    const near = L >= 8 ? nearMiss(target, rng) : null;
    distractors.push(rotate(near ?? otherShape(target, n, rng), rng.int(0, 3)));
  }
  const options = rng.shuffle([visibleTurn(target, rng), ...distractors]);
  const answer = options.findIndex(o => sameUpToRotation(o, target));
  return { kind: 'rotate', target, options, answer };
}

function makeShapeRound(level: number, kind: ShapeRound['kind'], rng: Rng): ShapeRound {
  return kind === 'fit' ? { kind: 'fit', ...makeFitRound(level, rng) } : makeRound(level, rng);
}

export interface RotateShapeState {
  phase: 'playing' | 'feedback' | 'done';
  level: number;
  round: number;
  current: ShapeRound;
  /** round kinds of the session, shuffled half and half */
  kinds: ShapeRound['kind'][];
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
    const half = ROTATE_SHAPE.rounds / 2;
    const kinds = ctx.rng.shuffle([...Array(half).fill('rotate'), ...Array(ROTATE_SHAPE.rounds - half).fill('fit')]) as ShapeRound['kind'][];
    return {
      phase: 'playing', level: L, round: 0, kinds, current: makeShapeRound(L, kinds[0], ctx.rng), roundStartedAt: ctx.now,
      answers: [], picked: null, score: 0, until: 0,
    };
  },

  reduce(state, event, ctx) {
    if (event.type === 'next') {
      if (state.phase !== 'feedback') return state;
      if (state.round >= ROTATE_SHAPE.rounds) return { ...state, phase: 'done' };
      return {
        ...state, phase: 'playing', current: makeShapeRound(state.level, state.kinds[state.round], ctx.rng),
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
