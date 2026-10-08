// "Repeat" (Simon): coloured panels light up one by one; tap them back in
// order. One game is one sequence length: repeat it and it is a win, and the
// next game is a step longer; a miss gets a second try with a new sequence,
// and after two misses the next game is a step shorter. Players asked for
// this after the first version grew the sequence within a game until they
// failed: that felt like pressure and every game ended in a loss.
// The level is the length (level + 2) and also sets the panel count and pace.
import type { EngineContext, GameEngine, GameSession, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { clampLevel, counterCues, percent } from '../common';

export const SEQUENCE = {
  /** tries per game, each with a new sequence of the same length */
  lives: 2,
  leadInMs: 700,
  feedbackMs: 1100,
} as const;

export interface SequenceLayout {
  panels: number;
  length: number;
  showMs: number;
  gapMs: number;
}

/** Level 1 → 3 steps … level 10 → 12; more panels only once sequences are long */
export function sequenceLayout(level: number): SequenceLayout {
  const L = clampLevel(level);
  return {
    panels: L <= 6 ? 4 : L <= 8 ? 6 : 9,
    length: L + 2,
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
  /** tries played so far */
  round: number;
  won: boolean;
  /** most steps repeated correctly in one try */
  best: number;
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
      round: 0, won: false, best: 0, lastCorrect: false, until: 0,
    };
    return show(base, randomSequence(layout.length, layout.panels, ctx.rng), ctx.now);
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
        if (state.won || state.lives <= 0) return { ...state, phase: 'done' };
        return show(state, randomSequence(state.layout.length, state.layout.panels, rng), now);
      }
      return state;
    }
    if (state.phase !== 'input' || event.panel < 0 || event.panel >= state.layout.panels) return state;
    if (event.panel !== state.sequence[state.inputIndex]) {
      return {
        ...state, phase: 'feedback', lastCorrect: false, lives: state.lives - 1, round: state.round + 1,
        best: Math.max(state.best, state.inputIndex), until: now + SEQUENCE.feedbackMs,
      };
    }
    const inputIndex = state.inputIndex + 1;
    if (inputIndex < state.sequence.length) return { ...state, inputIndex };
    return {
      ...state, inputIndex, phase: 'feedback', lastCorrect: true, won: true, round: state.round + 1,
      best: state.sequence.length, until: now + SEQUENCE.feedbackMs,
    };
  },

  timers(state): TimerRequest<SequenceEvent>[] {
    return state.phase === 'showing' || state.phase === 'feedback'
      ? [{ id: `${state.phase}-${state.round}-${state.step}`, at: state.until, event: { type: 'tick' } }]
      : [];
  },

  cues: counterCues<SequenceState>(s => (s.won ? 100 : 0) + s.inputIndex + s.round * 1000, s => SEQUENCE.lives - s.lives),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const { length, panels } = state.layout;
    return {
      // a win is worth its length, twice on the first try; a loss the steps repeated
      score: state.won ? length * (state.round === 1 ? 2 : 1) : state.best,
      accuracy: percent(state.won ? 1 : 0, state.round),
      avgTimeMs: 0,
      metrics: { won: state.won ? 1 : 0, length, tries: state.round, maxSequence: state.best, panels },
    };
  },
};

/**
 * Next game's length: a step longer after a first-try win, the same after a
 * win on the second try, a step shorter after a loss.
 * Sessions of the growing-sequence version (no `won`): replay the length reached.
 */
export function sequenceLevelStep(session: Pick<GameSession, 'metrics'>): number | undefined {
  const m = session.metrics;
  if (m.won === undefined) return m.maxSequence === undefined ? undefined : 0;
  return m.won ? (m.tries === 1 ? 1 : 0) : -1;
}

/** The growing-sequence version stored its own level; count it at the length reached */
export function sequenceSessionLevel(session: Pick<GameSession, 'level' | 'metrics'>): number {
  const m = session.metrics;
  if (m.won !== undefined || m.maxSequence === undefined) return session.level;
  return clampLevel(m.maxSequence - 2);
}

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
