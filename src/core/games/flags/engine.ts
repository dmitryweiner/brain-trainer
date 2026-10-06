// Flags: name the country of a flag, or pick the flag of a country (the
// variant chosen on the intro screen). The level adds answer options.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, elapsed, levelCeiling, percent, speedFactor } from '../common';
import { getAllCountries, type CountryData } from './data';

export const FLAGS = {
  rounds: 8,
  feedbackMs: 1200,
  basePoints: 10,
  maxTimeBonus: 10,
} as const;

export type FlagsMode = 'flag-to-country' | 'country-to-flag';

export function optionCount(level: number): number {
  const L = clampLevel(level);
  return L <= 4 ? 4 : L <= 8 ? 5 : 6;
}

/** Full bonus within 2 s, gone after 10 s (v1 rule) */
export function timeBonus(timeMs: number): number {
  if (timeMs <= 2000) return FLAGS.maxTimeBonus;
  return Math.round(Math.max(0, FLAGS.maxTimeBonus - (timeMs - 2000) / 800));
}

export interface FlagsState {
  phase: 'playing' | 'feedback' | 'done';
  level: number;
  mode: FlagsMode;
  round: number;
  answer: CountryData;
  options: CountryData[];
  used: string[];
  picked: string | null;
  roundStartedAt: number;
  answers: { correct: boolean; timeMs: number }[];
  score: number;
  until: number;
}

export type FlagsEvent = { type: 'pick'; code: string } | { type: 'next' };

function deal(state: FlagsState, rng: Rng, now: number): FlagsState {
  const all = getAllCountries();
  const fresh = all.filter(c => !state.used.includes(c.code));
  const answer = rng.pick(fresh.length > 0 ? fresh : all);
  const others = rng.sample(all.filter(c => c.code !== answer.code), optionCount(state.level) - 1);
  return {
    ...state, phase: 'playing', answer, options: rng.shuffle([answer, ...others]),
    used: [...state.used, answer.code], picked: null, roundStartedAt: now,
  };
}

export const flagsEngine: GameEngine<FlagsState, FlagsEvent> = {
  init(level, ctx: EngineContext, variant) {
    const all = getAllCountries();
    const base: FlagsState = {
      phase: 'playing', level: clampLevel(level), mode: variant === 'country-to-flag' ? 'country-to-flag' : 'flag-to-country',
      round: 0, answer: all[0], options: [], used: [], picked: null, roundStartedAt: ctx.now, answers: [], score: 0, until: 0,
    };
    return deal(base, ctx.rng, ctx.now);
  },

  reduce(state, event, ctx) {
    if (event.type === 'next') {
      if (state.phase !== 'feedback') return state;
      return state.round >= FLAGS.rounds ? { ...state, phase: 'done' } : deal(state, ctx.rng, ctx.now);
    }
    if (state.phase !== 'playing' || !state.options.some(o => o.code === event.code)) return state;
    const correct = event.code === state.answer.code;
    const timeMs = elapsed(ctx.now, state.roundStartedAt);
    return {
      ...state,
      phase: 'feedback',
      round: state.round + 1,
      picked: event.code,
      answers: [...state.answers, { correct, timeMs }],
      score: state.score + (correct ? FLAGS.basePoints + timeBonus(timeMs) : 0),
      until: ctx.now + FLAGS.feedbackMs,
    };
  },

  timers(state): TimerRequest<FlagsEvent>[] {
    return state.phase === 'feedback' ? [{ id: `next-${state.round}`, at: state.until, event: { type: 'next' } }] : [];
  },

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const correct = state.answers.filter(a => a.correct);
    return {
      score: state.score,
      accuracy: percent(correct.length, state.answers.length),
      avgTimeMs: average(state.answers.map(a => a.timeMs)),
      metrics: {
        correct: correct.length,
        rounds: state.answers.length,
        options: optionCount(state.level),
        reverse: state.mode === 'country-to-flag' ? 1 : 0,
      },
    };
  },
};

/** v1: 5 rounds × (10 + up to 10), 4 options, i.e. level 1 */
const V1_MAX_SCORE = 100;

/** Accuracy × speed (≤2.5 s full, ≥10 s 60%) × the level's ceiling */
export function flagsRating(outcome: SessionOutcome, level: number): number {
  if (outcome.metrics.correct === undefined) return (outcome.score / V1_MAX_SCORE) * levelCeiling(level);
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 2500, 10000, 0.6) * levelCeiling(level);
}
