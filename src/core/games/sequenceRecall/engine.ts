// "Repeat" (Simon): coloured panels light up one by one; tap them back in
// order. Each success adds one step, so the length grows without a cap;
// two mistakes end the session. The level sets the panel count (4/6/9),
// the starting length and the pace.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { clampLevel, percent } from '../common';

export const SEQUENCE = {
  lives: 2,
  maxRounds: 12,
  leadInMs: 700,
  feedbackMs: 900,
  maxLength: 20,
} as const;

export interface SequenceLayout {
  panels: number;
  startLength: number;
  showMs: number;
  gapMs: number;
}

export function sequenceLayout(level: number): SequenceLayout {
  const L = clampLevel(level);
  return {
    panels: L <= 4 ? 4 : L <= 7 ? 6 : 9,
    startLength: 3 + Math.floor((L - 1) / 3),
    showMs: Math.max(350, 750 - 40 * (L - 1)),
    gapMs: 250,
  };
}

export interface SequenceState {
  phase: 'showing' | 'input' | 'feedback' | 'done';
  level: number;
  layout: SequenceLayout;
  sequence: number[];
  /** showing: -1 lead-in, then even = lit, odd = gap; panel = sequence[step >> 1] */
  step: number;
  inputIndex: number;
  lives: number;
  round: number;
  successes: number;
  maxSequence: number;
  score: number;
  lastCorrect: boolean;
  until: number;
}

export type SequenceEvent = { type: 'tap'; panel: number } | { type: 'tick' };

/** The panel lit right now while showing, else null */
export function litPanel(state: SequenceState): number | null {
  return state.phase === 'showing' && state.step >= 0 && state.step % 2 === 0 ? state.sequence[state.step >> 1] : null;
}

function randomSequence(length: number, panels: number, rng: Rng): number[] {
  return Array.from({ length }, () => rng.int(0, panels - 1));
}

function show(state: SequenceState, sequence: number[], now: number): SequenceState {
  return { ...state, phase: 'showing', sequence, step: -1, inputIndex: 0, until: now + SEQUENCE.leadInMs };
}

export const sequenceEngine: GameEngine<SequenceState, SequenceEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const layout = sequenceLayout(L);
    const base: SequenceState = {
      phase: 'showing', level: L, layout, sequence: [], step: -1, inputIndex: 0, lives: SEQUENCE.lives,
      round: 0, successes: 0, maxSequence: 0, score: 0, lastCorrect: false, until: 0,
    };
    return show(base, randomSequence(layout.startLength, layout.panels, ctx.rng), ctx.now);
  },

  reduce(state, event, ctx) {
    const { now, rng } = ctx;
    if (event.type === 'tick') {
      if (state.phase === 'showing') {
        const step = state.step + 1;
        if (step >= state.sequence.length * 2) return { ...state, phase: 'input', step };
        return { ...state, step, until: now + (step % 2 === 0 ? state.layout.showMs : state.layout.gapMs) };
      }
      if (state.phase === 'feedback') {
        if (state.lives <= 0 || state.round >= SEQUENCE.maxRounds) return { ...state, phase: 'done' };
        const { panels } = state.layout;
        const next = state.lastCorrect && state.sequence.length < SEQUENCE.maxLength
          ? [...state.sequence, rng.int(0, panels - 1)]
          : randomSequence(state.sequence.length, panels, rng);
        return show(state, next, now);
      }
      return state;
    }
    if (state.phase !== 'input' || event.panel < 0 || event.panel >= state.layout.panels) return state;
    if (event.panel !== state.sequence[state.inputIndex]) {
      return {
        ...state, phase: 'feedback', lastCorrect: false, lives: state.lives - 1, round: state.round + 1,
        until: now + SEQUENCE.feedbackMs,
      };
    }
    const inputIndex = state.inputIndex + 1;
    if (inputIndex < state.sequence.length) return { ...state, inputIndex };
    return {
      ...state,
      inputIndex,
      phase: 'feedback',
      lastCorrect: true,
      round: state.round + 1,
      successes: state.successes + 1,
      maxSequence: Math.max(state.maxSequence, state.sequence.length),
      score: state.score + state.sequence.length,
      until: now + SEQUENCE.feedbackMs,
    };
  },

  timers(state): TimerRequest<SequenceEvent>[] {
    return state.phase === 'showing' || state.phase === 'feedback'
      ? [{ id: `${state.phase}-${state.round}-${state.step}`, at: state.until, event: { type: 'tick' } }]
      : [];
  },

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    return {
      score: state.score,
      accuracy: percent(state.successes, state.round),
      avgTimeMs: 0,
      metrics: { maxSequence: state.maxSequence, rounds: state.round, panels: state.layout.panels },
    };
  },
};

/** Raw-score maximum of the v1 game (sequences of 3…6) */
const V1_MAX_SCORE = 18;

function spanRating(maxSequence: number, panels: number): number {
  const panelBonus = panels >= 9 ? 1 : panels >= 6 ? 0.9 : 0.8;
  return Math.min(1, Math.max(0, (maxSequence - 2) / 10)) * panelBonus * 1000;
}

/**
 * The longest repeated sequence decides it (12 = 1000 on 9 panels); fewer
 * panels are easier and count less. v1 history maps 18 points ≈ length 6 on 4 panels.
 */
export function sequenceRating(outcome: SessionOutcome): number {
  if (outcome.metrics.maxSequence === undefined) return (outcome.score / V1_MAX_SCORE) * spanRating(6, 4);
  return spanRating(outcome.metrics.maxSequence, outcome.metrics.panels);
}
