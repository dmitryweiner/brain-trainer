// Mirror: a mirror stands on one side of the shape; which option is its
// reflection? The answer is the exact image in that mirror: a side mirror
// flips left–right, one above or below flips upside down, so the image in the
// other kind of mirror is a distractor, along with the shape turned and near
// misses. Side mirrors only up to level 3; from level 4 any side (players
// asked for mirrors not only on the right, 2026-10-09).
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';
import { key, mirror, nearMiss, normalize, randomChiral, rotate, sameUpToRotation, type Shape } from '../shapes/polyomino';
import { cellsFor } from '../rotateShape/engine';

export const MIRROR = {
  rounds: 12,
  feedbackMs: 700,
  options: 4,
} as const;

export type MirrorSide = 'left' | 'right' | 'top' | 'bottom';

export interface MirrorRound {
  target: Shape;
  side: MirrorSide;
  options: Shape[];
  answer: number;
}

/** The shape as seen in a mirror on `side` */
export function reflect(shape: Shape, side: MirrorSide): Shape {
  return side === 'left' || side === 'right' ? mirror(shape) : normalize(shape.map(([x, y]) => [x, -y] as const));
}

export function sidesFor(level: number): MirrorSide[] {
  return clampLevel(level) <= 3 ? ['left', 'right'] : ['left', 'right', 'top', 'bottom'];
}

export function makeMirrorRound(level: number, rng: Rng): MirrorRound {
  const L = clampLevel(level);
  const target = randomChiral(cellsFor(L), rng);
  const side = rng.pick(sidesFor(L));
  const image = reflect(target, side);
  const otherAxis = reflect(target, side === 'left' || side === 'right' ? 'top' : 'left');
  const candidates: Shape[] = [];
  if (L >= 2) candidates.push(otherAxis);
  if (L >= 6) {
    const near = nearMiss(image, rng);
    if (near) candidates.push(near);
  }
  // the shape itself, as is and turned: no mirror shows it like that
  candidates.push(...rng.shuffle([0, 1, 2, 3]).map(k => rotate(target, k)));
  const seen = new Set([key(image)]);
  const distractors: Shape[] = [];
  for (const c of candidates) {
    if (distractors.length >= MIRROR.options - 1) break;
    if (seen.has(key(c))) continue;
    seen.add(key(c));
    distractors.push(c);
  }
  // a symmetric shape has few distinct turns: fill up with other shapes
  while (distractors.length < MIRROR.options - 1) {
    const other = rotate(randomChiral(target.length, rng), rng.int(0, 3));
    if (seen.has(key(other)) || sameUpToRotation(other, target) || sameUpToRotation(other, image)) continue;
    seen.add(key(other));
    distractors.push(other);
  }
  const options = rng.shuffle([image, ...distractors]);
  return { target, side, options, answer: options.indexOf(image) };
}

export interface MirrorState {
  phase: 'playing' | 'feedback' | 'done';
  level: number;
  round: number;
  current: MirrorRound;
  roundStartedAt: number;
  answers: { correct: boolean; timeMs: number }[];
  picked: number | null;
  score: number;
  until: number;
}

export type MirrorEvent = { type: 'pick'; index: number } | { type: 'next' };

export const mirrorEngine: GameEngine<MirrorState, MirrorEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    return {
      phase: 'playing', level: L, round: 0, current: makeMirrorRound(L, ctx.rng), roundStartedAt: ctx.now,
      answers: [], picked: null, score: 0, until: 0,
    };
  },

  reduce(state, event, ctx) {
    if (event.type === 'next') {
      if (state.phase !== 'feedback') return state;
      if (state.round >= MIRROR.rounds) return { ...state, phase: 'done' };
      return { ...state, phase: 'playing', current: makeMirrorRound(state.level, ctx.rng), roundStartedAt: ctx.now, picked: null };
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
      until: ctx.now + MIRROR.feedbackMs,
    };
  },

  timers(state): TimerRequest<MirrorEvent>[] {
    return state.phase === 'feedback' ? [{ id: `next-${state.round}`, at: state.until, event: { type: 'next' } }] : [];
  },

  cues: counterCues<MirrorState>(s => s.answers.filter(a => a.correct).length, s => s.answers.filter(a => !a.correct).length),

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
export function mirrorRating(outcome: SessionOutcome, level: number): number {
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 3000, 10000, 0.6) * levelCeiling(level);
}
