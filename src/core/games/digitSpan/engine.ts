// Digit span ("Числовая память", game id phone-recall): digits appear one at
// a time; type them back, from level 4 also in reverse order (the classic
// working-memory test). Length adapts per direction: +1 after a success,
// −1 after a miss, within 3…12.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { clampLevel, percent } from '../common';

export const DIGIT_SPAN = {
  trials: 8,
  minLength: 3,
  maxLength: 12,
  gapMs: 250,
  leadInMs: 700,
  feedbackMs: 1200,
  /** From this level every second trial is backwards */
  backwardFrom: 4,
} as const;

export type Direction = 'forward' | 'backward';

export function digitLayout(level: number): { startLength: number; digitMs: number; backward: boolean } {
  const L = clampLevel(level);
  return {
    startLength: 3 + Math.floor((L - 1) / 2),
    digitMs: Math.max(500, 1000 - 50 * (L - 1)),
    backward: L >= DIGIT_SPAN.backwardFrom,
  };
}

export interface DigitTrial {
  direction: Direction;
  length: number;
  correct: boolean;
}

export interface DigitSpanState {
  phase: 'showing' | 'input' | 'feedback' | 'done';
  level: number;
  digitMs: number;
  backward: boolean;
  direction: Direction;
  digits: number[];
  /** showing: -1 lead-in, then even = digit shown, odd = gap */
  step: number;
  input: number[];
  length: Record<Direction, number>;
  trials: DigitTrial[];
  score: number;
  until: number;
}

export type DigitSpanEvent = { type: 'digit'; digit: number } | { type: 'erase' } | { type: 'tick' };

export function shownDigit(state: DigitSpanState): number | null {
  return state.phase === 'showing' && state.step >= 0 && state.step % 2 === 0 ? state.digits[state.step >> 1] : null;
}

/** What the player must type */
export function expected(state: Pick<DigitSpanState, 'digits' | 'direction'>): number[] {
  return state.direction === 'backward' ? [...state.digits].reverse() : state.digits;
}

function digitsOf(length: number, rng: Rng): number[] {
  // no digit twice in a row: "5 5" is hard to see as two items
  const out: number[] = [];
  while (out.length < length) {
    const d = rng.int(0, 9);
    if (d !== out[out.length - 1]) out.push(d);
  }
  return out;
}

function startTrial(state: DigitSpanState, rng: Rng, now: number): DigitSpanState {
  const direction: Direction = state.backward && state.trials.length % 2 === 1 ? 'backward' : 'forward';
  return {
    ...state, phase: 'showing', direction, digits: digitsOf(state.length[direction], rng), step: -1, input: [],
    until: now + DIGIT_SPAN.leadInMs,
  };
}

const clampLen = (n: number) => Math.min(DIGIT_SPAN.maxLength, Math.max(DIGIT_SPAN.minLength, n));

export const digitSpanEngine: GameEngine<DigitSpanState, DigitSpanEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const { startLength, digitMs, backward } = digitLayout(L);
    const base: DigitSpanState = {
      phase: 'showing', level: L, digitMs, backward, direction: 'forward', digits: [], step: -1, input: [],
      length: { forward: startLength, backward: clampLen(startLength - 1) }, trials: [], score: 0, until: 0,
    };
    return startTrial(base, ctx.rng, ctx.now);
  },

  reduce(state, event, ctx) {
    const { now, rng } = ctx;
    if (event.type === 'tick') {
      if (state.phase === 'showing') {
        const step = state.step + 1;
        if (step >= state.digits.length * 2) return { ...state, phase: 'input', step };
        return { ...state, step, until: now + (step % 2 === 0 ? state.digitMs : DIGIT_SPAN.gapMs) };
      }
      if (state.phase === 'feedback') {
        return state.trials.length >= DIGIT_SPAN.trials ? { ...state, phase: 'done' } : startTrial(state, rng, now);
      }
      return state;
    }
    if (state.phase !== 'input') return state;
    if (event.type === 'erase') return { ...state, input: state.input.slice(0, -1) };
    if (event.digit < 0 || event.digit > 9) return state;
    const input = [...state.input, event.digit];
    if (input.length < state.digits.length) return { ...state, input };
    const want = expected(state);
    const correct = input.every((d, i) => d === want[i]);
    const len = state.digits.length;
    return {
      ...state,
      input,
      phase: 'feedback',
      trials: [...state.trials, { direction: state.direction, length: len, correct }],
      length: { ...state.length, [state.direction]: clampLen(len + (correct ? 1 : -1)) },
      score: state.score + (correct ? len : 0),
      until: now + DIGIT_SPAN.feedbackMs,
    };
  },

  timers(state): TimerRequest<DigitSpanEvent>[] {
    return state.phase === 'showing' || state.phase === 'feedback'
      ? [{ id: `${state.phase}-${state.trials.length}-${state.step}`, at: state.until, event: { type: 'tick' } }]
      : [];
  },

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const best = (d: Direction) => Math.max(0, ...state.trials.filter(t => t.correct && t.direction === d).map(t => t.length));
    const correct = state.trials.filter(t => t.correct).length;
    const metrics: Record<string, number> = { maxForward: best('forward'), correct, trials: state.trials.length };
    if (state.backward) metrics.maxBackward = best('backward');
    return { score: state.score, accuracy: percent(correct, state.trials.length), avgTimeMs: 0, metrics };
  },
};

/** Raw-score maximum of the v1 game (numbers of 4…7 digits) */
const V1_MAX_SCORE = 22;

function spanRating(span: number): number {
  return Math.min(1, Math.max(0, (span - 2) / 9)) * 1000;
}

/**
 * The span decides it: 11 digits = 1000. Backwards is harder, so a
 * backward span counts 1.25×. v1 history maps 22 points ≈ a 7-digit span.
 */
export function digitSpanRating(outcome: SessionOutcome): number {
  if (outcome.metrics.maxForward === undefined) return (outcome.score / V1_MAX_SCORE) * spanRating(7);
  return spanRating(Math.max(outcome.metrics.maxForward, (outcome.metrics.maxBackward ?? 0) * 1.25));
}
