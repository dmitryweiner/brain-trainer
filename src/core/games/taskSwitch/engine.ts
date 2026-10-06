// "Switch" (game id dual-rule-reaction): answer by the current rule —
// shape, colour, or (from level 3) the ink of a colour word (Stroop). The
// rule changes at random; up to level 5 a warning comes first. A time limit
// per answer and 3 lives (a wrong or late answer costs one).
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, elapsed, levelCeiling, percent, speedFactor } from '../common';

export const SWITCH = {
  trials: 30,
  lives: 3,
  switchChance: 0.3,
  cueMs: 1100,
  feedbackMs: 500,
  leadInMs: 600,
} as const;

export type Rule = 'shape' | 'color' | 'ink';
export type Shape = 'circle' | 'square';
export type Hue = 'green' | 'red';
/** The two answer buttons; what each means depends on the rule */
export type Side = 'left' | 'right';

export interface Stimulus {
  /** figure: shape in a colour; word: a colour name printed in an ink */
  kind: 'figure' | 'word';
  shape: Shape;
  color: Hue;
  word: Hue;
}

export interface SwitchLayout {
  rules: Rule[];
  warn: boolean;
  limitMs: number;
}

export function switchLayout(level: number): SwitchLayout {
  const L = clampLevel(level);
  return {
    rules: L >= 3 ? ['shape', 'color', 'ink'] : ['shape', 'color'],
    warn: L <= 5,
    limitMs: Math.max(1200, 2600 - 120 * (L - 1)),
  };
}

/** left = circle / green, right = square / red */
export function correctSide(rule: Rule, s: Stimulus): Side {
  if (rule === 'shape') return s.shape === 'circle' ? 'left' : 'right';
  return s.color === 'green' ? 'left' : 'right';
}

export interface SwitchTrial {
  rule: Rule;
  switched: boolean;
  correct: boolean;
  timedOut: boolean;
  timeMs: number;
}

export interface SwitchState {
  phase: 'leadIn' | 'cue' | 'stimulus' | 'feedback' | 'done';
  level: number;
  layout: SwitchLayout;
  rule: Rule;
  switched: boolean;
  stimulus: Stimulus;
  shownAt: number;
  until: number;
  lives: number;
  trials: SwitchTrial[];
  lastCorrect: boolean;
  score: number;
}

export type SwitchEvent = { type: 'answer'; side: Side } | { type: 'tick' };

function stimulusFor(rule: Rule, rng: Rng): Stimulus {
  const hue = (): Hue => (rng.next() < 0.5 ? 'green' : 'red');
  if (rule === 'ink') {
    // Stroop: mostly incongruent, so reading the word gives the wrong answer
    const color = hue();
    const word = rng.next() < 0.75 ? (color === 'green' ? 'red' : 'green') : color;
    return { kind: 'word', shape: 'circle', color, word };
  }
  return { kind: 'figure', shape: rng.next() < 0.5 ? 'circle' : 'square', color: hue(), word: 'green' };
}

function nextTrial(state: SwitchState, rng: Rng, now: number, first = false): SwitchState {
  const others = state.layout.rules.filter(r => r !== state.rule);
  const switched = !first && rng.next() < SWITCH.switchChance;
  const rule = switched ? rng.pick(others) : state.rule;
  const stimulus = stimulusFor(rule, rng);
  if (switched && state.layout.warn) return { ...state, phase: 'cue', rule, switched, stimulus, until: now + SWITCH.cueMs };
  return { ...state, phase: 'stimulus', rule, switched, stimulus, shownAt: now, until: now + state.layout.limitMs };
}

function judge(state: SwitchState, now: number, side: Side | null): SwitchState {
  const correct = side !== null && side === correctSide(state.rule, state.stimulus);
  const trial: SwitchTrial = {
    rule: state.rule, switched: state.switched, correct, timedOut: side === null, timeMs: elapsed(now, state.shownAt),
  };
  return {
    ...state,
    phase: 'feedback',
    trials: [...state.trials, trial],
    lives: state.lives - (correct ? 0 : 1),
    lastCorrect: correct,
    // a correct answer right after a switch is worth double
    score: state.score + (correct ? (state.switched ? 2 : 1) : 0),
    until: now + SWITCH.feedbackMs,
  };
}

export const taskSwitchEngine: GameEngine<SwitchState, SwitchEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const layout = switchLayout(L);
    const rule = ctx.rng.pick(layout.rules.filter(r => r !== 'ink'));
    return {
      phase: 'leadIn', level: L, layout, rule, switched: false, stimulus: stimulusFor(rule, ctx.rng), shownAt: 0,
      until: ctx.now + SWITCH.leadInMs, lives: SWITCH.lives, trials: [], lastCorrect: false, score: 0,
    };
  },

  reduce(state, event, ctx) {
    const { now, rng } = ctx;
    if (event.type === 'answer') return state.phase === 'stimulus' ? judge(state, now, event.side) : state;
    switch (state.phase) {
      case 'leadIn':
        return { ...state, phase: 'stimulus', shownAt: now, until: now + state.layout.limitMs };
      case 'cue':
        return { ...state, phase: 'stimulus', shownAt: now, until: now + state.layout.limitMs };
      case 'stimulus':
        return judge(state, now, null);
      case 'feedback':
        return state.lives <= 0 || state.trials.length >= SWITCH.trials ? { ...state, phase: 'done' } : nextTrial(state, rng, now);
      default:
        return state;
    }
  },

  timers(state): TimerRequest<SwitchEvent>[] {
    return state.phase === 'done' ? [] : [{ id: `${state.phase}-${state.trials.length}`, at: state.until, event: { type: 'tick' } }];
  },

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const { trials } = state;
    const correct = trials.filter(t => t.correct);
    const rt = (switched: boolean) => average(correct.filter(t => t.switched === switched).map(t => t.timeMs));
    const metrics: Record<string, number> = {
      correct: correct.length,
      errors: trials.filter(t => !t.correct && !t.timedOut).length,
      timeouts: trials.filter(t => t.timedOut).length,
      livesLeft: Math.max(0, state.lives),
      trials: trials.length,
    };
    if (correct.some(t => t.switched) && correct.some(t => !t.switched)) metrics.switchCostMs = rt(true) - rt(false);
    return { score: state.score, accuracy: percent(correct.length, trials.length), avgTimeMs: average(correct.map(t => t.timeMs)), metrics };
  },
};

/** Level that v1 sessions (one known switch, no time limit) correspond to */
export const V1_EQUIVALENT_LEVEL = 2;
/** Raw-score maximum of the v1 game */
const V1_MAX_SCORE = 30;

export function taskSwitchSessionLevel(session: { level: number; metrics: Record<string, number> }): number {
  return session.metrics.correct === undefined ? V1_EQUIVALENT_LEVEL : session.level;
}

/** Accuracy × speed (≤700 ms full, ≥2 s half) × level ceiling; running out of lives costs 40% */
export function taskSwitchRating(outcome: SessionOutcome, level: number): number {
  if (outcome.metrics.correct === undefined) return (outcome.score / V1_MAX_SCORE) * levelCeiling(level);
  const survived = outcome.metrics.livesLeft > 0 ? 1 : 0.6;
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 700, 2000, 0.5) * survived * levelCeiling(level);
}
