// Mirror: which option is the shape's mirror image? The others are the
// shape itself turned (which no mirror produces, the shapes being chiral)
// and near misses. From level 4 the mirror image is also turned.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';
import { mirror, nearMiss, randomChiral, rotate, sameUpToRotation, type Shape } from '../shapes/polyomino';
import { cellsFor } from '../rotateShape/engine';

export const MIRROR = {
  rounds: 12,
  feedbackMs: 700,
  options: 4,
} as const;

export interface MirrorRound {
  target: Shape;
  options: Shape[];
  answer: number;
}

export function makeMirrorRound(level: number, rng: Rng): MirrorRound {
  const L = clampLevel(level);
  const target = randomChiral(cellsFor(L), rng);
  const image = mirror(target);
  // low levels: a plain left–right flip; then the image may also be turned
  const answerShape = L <= 3 ? image : rotate(image, rng.int(0, 3));
  const distractors: Shape[] = [];
  const turns = rng.shuffle([1, 2, 3, 0]);
  distractors.push(rotate(target, turns[0]));
  while (distractors.length < MIRROR.options - 1) {
    const near = L >= 6 ? nearMiss(image, rng) : null;
    distractors.push(near ? rotate(near, rng.int(0, 3)) : rotate(target, turns[distractors.length]));
  }
  const options = rng.shuffle([answerShape, ...distractors]);
  return { target, options, answer: options.findIndex(o => sameUpToRotation(o, image)) };
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
