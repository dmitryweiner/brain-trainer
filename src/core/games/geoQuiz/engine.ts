// Geography quizzes on one engine: flag → country, country → flag, capitals
// (both ways, mixed), parts of the world. The kind is fixed per registered
// game (makeGeoEngine). The level adds options and, from level 5, hides the
// country's name so the flag alone must be recognised.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';
import { SUPPORTED_COUNTRY_CODES, FLAG_EMOJIS, type SupportedCountryCode } from '../flags/data';
import { CAPITAL_COUNTRIES, CONTINENT_OF, CONTINENTS, type Continent } from './data';

export const GEO = {
  rounds: 8,
  feedbackMs: 1200,
  basePoints: 10,
  maxTimeBonus: 10,
} as const;

export type GeoKind = 'flag-to-country' | 'country-to-flag' | 'capitals' | 'continents';

/** What the question shows */
export type GeoPrompt =
  | { show: 'flag'; code: SupportedCountryCode }
  | { show: 'country'; code: SupportedCountryCode }
  | { show: 'flag+country'; code: SupportedCountryCode }
  | { show: 'capital'; code: SupportedCountryCode };

/** What the options are: countries by name, flags, capitals (by country code) or continents */
export type GeoOptionKind = 'country' | 'flag' | 'capital' | 'continent';

export interface GeoQuestion {
  /** i18n key of the question line */
  ask: string;
  prompt: GeoPrompt;
  optionKind: GeoOptionKind;
  options: string[];
  answer: string;
}

export function optionCount(level: number): number {
  const L = clampLevel(level);
  return L <= 4 ? 4 : L <= 8 ? 5 : 6;
}

/** From this level the country's name is hidden and the flag must speak for itself */
export const FLAG_ONLY_FROM = 5;

/** Full bonus within 2 s, gone after 10 s (the v1 Flags rule) */
export function timeBonus(timeMs: number): number {
  if (timeMs <= 2000) return GEO.maxTimeBonus;
  return Math.round(Math.max(0, GEO.maxTimeBonus - (timeMs - 2000) / 800));
}

export function flagOf(code: string): string {
  return FLAG_EMOJIS[code as SupportedCountryCode] ?? '🏳️';
}

function choices(pool: readonly SupportedCountryCode[], answer: SupportedCountryCode, n: number, rng: Rng): string[] {
  return rng.shuffle([answer, ...rng.sample(pool.filter(c => c !== answer), n - 1)]);
}

export function makeQuestion(kind: GeoKind, level: number, used: readonly string[], rng: Rng): GeoQuestion {
  const L = clampLevel(level);
  const n = optionCount(L);
  const named = L < FLAG_ONLY_FROM;
  const fresh = <T extends string>(pool: readonly T[]) => {
    const unused = pool.filter(c => !used.includes(c));
    return rng.pick(unused.length > 0 ? unused : pool);
  };
  switch (kind) {
    case 'flag-to-country': {
      const code = fresh(SUPPORTED_COUNTRY_CODES);
      return { ask: 'geo.askCountry', prompt: { show: 'flag', code }, optionKind: 'country', options: choices(SUPPORTED_COUNTRY_CODES, code, n, rng), answer: code };
    }
    case 'country-to-flag': {
      const code = fresh(SUPPORTED_COUNTRY_CODES);
      return { ask: 'geo.askFlag', prompt: { show: 'country', code }, optionKind: 'flag', options: choices(SUPPORTED_COUNTRY_CODES, code, n, rng), answer: code };
    }
    case 'capitals': {
      const code = fresh(CAPITAL_COUNTRIES);
      // half the questions ask for the capital, half for the country of a capital
      if (rng.next() < 0.5) {
        return {
          ask: 'geo.askCapital', prompt: { show: named ? 'flag+country' : 'flag', code }, optionKind: 'capital',
          options: choices(CAPITAL_COUNTRIES, code, n, rng), answer: code,
        };
      }
      return { ask: 'geo.askCapitalOf', prompt: { show: 'capital', code }, optionKind: 'country', options: choices(CAPITAL_COUNTRIES, code, n, rng), answer: code };
    }
    case 'continents': {
      const pool = Object.keys(CONTINENT_OF) as SupportedCountryCode[];
      const code = fresh(pool);
      const answer = CONTINENT_OF[code]!;
      const others = CONTINENTS.filter(c => c !== answer);
      const options = rng.shuffle([answer, ...rng.sample(others, (named ? 4 : CONTINENTS.length) - 1)]);
      return { ask: 'geo.askContinent', prompt: { show: named ? 'flag+country' : 'flag', code }, optionKind: 'continent', options, answer };
    }
  }
}

export interface GeoState {
  phase: 'playing' | 'feedback' | 'done';
  kind: GeoKind;
  level: number;
  round: number;
  question: GeoQuestion;
  /** countries asked so far (not repeated within a session) */
  used: string[];
  picked: string | null;
  roundStartedAt: number;
  answers: { correct: boolean; timeMs: number }[];
  score: number;
  until: number;
}

export type GeoEvent = { type: 'pick'; option: string } | { type: 'next' };

function deal(state: GeoState, rng: Rng, now: number): GeoState {
  const question = makeQuestion(state.kind, state.level, state.used, rng);
  return { ...state, phase: 'playing', question, used: [...state.used, question.prompt.code], picked: null, roundStartedAt: now };
}

export function makeGeoEngine(kind: GeoKind): GameEngine<GeoState, GeoEvent> {
  return {
    init(level, ctx: EngineContext) {
      const L = clampLevel(level);
      const question = makeQuestion(kind, L, [], ctx.rng);
      return {
        phase: 'playing', kind, level: L, round: 0, question, used: [question.prompt.code], picked: null,
        roundStartedAt: ctx.now, answers: [], score: 0, until: 0,
      };
    },

    reduce(state, event, ctx) {
      if (event.type === 'next') {
        if (state.phase !== 'feedback') return state;
        return state.round >= GEO.rounds ? { ...state, phase: 'done' } : deal(state, ctx.rng, ctx.now);
      }
      if (state.phase !== 'playing' || !state.question.options.includes(event.option)) return state;
      const correct = event.option === state.question.answer;
      const timeMs = elapsed(ctx.now, state.roundStartedAt);
      return {
        ...state,
        phase: 'feedback',
        round: state.round + 1,
        picked: event.option,
        answers: [...state.answers, { correct, timeMs }],
        score: state.score + (correct ? GEO.basePoints + timeBonus(timeMs) : 0),
        until: ctx.now + GEO.feedbackMs,
      };
    },

    timers(state): TimerRequest<GeoEvent>[] {
      return state.phase === 'feedback' ? [{ id: `next-${state.round}`, at: state.until, event: { type: 'next' } }] : [];
    },

    cues: counterCues<GeoState>(s => s.answers.filter(a => a.correct).length, s => s.answers.filter(a => !a.correct).length),

    isFinished: state => state.phase === 'done',

    result(state): SessionOutcome {
      const correct = state.answers.filter(a => a.correct).length;
      return {
        score: state.score,
        accuracy: percent(correct, state.answers.length),
        avgTimeMs: average(state.answers.map(a => a.timeMs)),
        metrics: { correct, rounds: state.answers.length, options: optionCount(state.level) },
      };
    },
  };
}

/** v1 Flags: 5 rounds × (10 + up to 10), 4 options, i.e. level 1 */
const V1_MAX_SCORE = 100;

/** Accuracy × speed (≤2.5 s full, ≥10 s 60%) × the level's ceiling */
export function geoRating(outcome: SessionOutcome, level: number): number {
  if (outcome.metrics.correct === undefined) return (outcome.score / V1_MAX_SCORE) * levelCeiling(level);
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 2500, 10000, 0.6) * levelCeiling(level);
}

export type { Continent };
