// Fact quizzes on one engine: flags, capitals, currencies and car logos (each
// both ways, mixed at random), parts of the world. The kind is fixed per registered
// game (makeGeoEngine). The level adds options and, from level 5, hides the
// country's name so the flag alone must be recognised.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';
import { SUPPORTED_COUNTRY_CODES, FLAG_EMOJIS, type SupportedCountryCode } from '../flags/data';
import { CAPITAL_COUNTRIES, CONTINENT_OF, CONTINENTS, type Continent } from './data';
import { COUNTRY_OF_UNIQUE_CURRENCY, CURRENCIES, CURRENCY_CONFLICTS, CURRENCY_OF } from './facts';
import { CAR_BRANDS, type CarBrand } from './cars';

export const GEO = {
  rounds: 8,
  feedbackMs: 1200,
  basePoints: 10,
  maxTimeBonus: 10,
} as const;

export type GeoKind = 'flags' | 'capitals' | 'continents' | 'currencies' | 'car-logos';

/** What the question shows */
export type GeoPrompt =
  | { show: 'flag'; code: SupportedCountryCode }
  | { show: 'country'; code: SupportedCountryCode }
  | { show: 'flag+country'; code: SupportedCountryCode }
  | { show: 'capital'; code: SupportedCountryCode }
  /** the country's currency, named */
  | { show: 'currency'; code: SupportedCountryCode }
  /** a car brand's logo, or its name */
  | { show: 'logo'; code: CarBrand }
  | { show: 'brand'; code: CarBrand };

/**
 * What the options are: countries by name (with their flags where the flag
 * gives nothing away), flags, capitals (by country code), continents, currency ids,
 * car brands by name or by logo
 */
export type GeoOptionKind = 'country' | 'country+flag' | 'flag' | 'capital' | 'continent' | 'currency' | 'brand' | 'logo';

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

function choices<T extends string>(pool: readonly T[], answer: T, n: number, rng: Rng): string[] {
  return rng.shuffle([answer, ...rng.sample(pool.filter(c => c !== answer), n - 1)]);
}

const conflicting = (a: string, b: string) => CURRENCY_CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** The answer plus n − 1 distractors that are allowed and do not clash with each other */
function pickOptions<T extends string>(answer: T, pool: readonly T[], n: number, rng: Rng, ok: (option: T, chosen: readonly T[]) => boolean): T[] {
  const chosen: T[] = [answer];
  for (const option of rng.shuffle(pool.filter(o => o !== answer))) {
    if (chosen.length >= n) break;
    if (ok(option, chosen)) chosen.push(option);
  }
  return rng.shuffle(chosen);
}

const UNIQUE_CURRENCY_COUNTRIES = [...COUNTRY_OF_UNIQUE_CURRENCY.values()];

export function makeQuestion(kind: GeoKind, level: number, used: readonly string[], rng: Rng): GeoQuestion {
  const L = clampLevel(level);
  const n = optionCount(L);
  const named = L < FLAG_ONLY_FROM;
  const shownCountry = (code: SupportedCountryCode): GeoPrompt => (named ? { show: 'flag+country', code } : { show: 'flag', code });
  const fresh = <T extends string>(pool: readonly T[]) => {
    const unused = pool.filter(c => !used.includes(c));
    return rng.pick(unused.length > 0 ? unused : pool);
  };
  switch (kind) {
    case 'flags': {
      // whose flag is it, or which flag is the country's: at random
      const code = fresh(SUPPORTED_COUNTRY_CODES);
      const options = choices(SUPPORTED_COUNTRY_CODES, code, n, rng);
      return rng.next() < 0.5
        ? { ask: 'geo.askCountry', prompt: { show: 'flag', code }, optionKind: 'country', options, answer: code }
        : { ask: 'geo.askFlag', prompt: { show: 'country', code }, optionKind: 'flag', options, answer: code };
    }
    case 'capitals': {
      const code = fresh(CAPITAL_COUNTRIES);
      // half the questions ask for the capital, half for the country of a capital
      if (rng.next() < 0.5) {
        return {
          ask: 'geo.askCapital', prompt: shownCountry(code), optionKind: 'capital',
          options: choices(CAPITAL_COUNTRIES, code, n, rng), answer: code,
        };
      }
      return { ask: 'geo.askCapitalOf', prompt: { show: 'capital', code }, optionKind: 'country+flag', options: choices(CAPITAL_COUNTRIES, code, n, rng), answer: code };
    }
    case 'continents': {
      const pool = Object.keys(CONTINENT_OF) as SupportedCountryCode[];
      const code = fresh(pool);
      const answer = CONTINENT_OF[code]!;
      const others = CONTINENTS.filter(c => c !== answer);
      const options = rng.shuffle([answer, ...rng.sample(others, (named ? 4 : CONTINENTS.length) - 1)]);
      return { ask: 'geo.askContinent', prompt: shownCountry(code), optionKind: 'continent', options, answer };
    }
    case 'currencies': {
      // "which country pays in…?" only for currencies used by one country
      if (rng.next() < 0.5) {
        const code = fresh(UNIQUE_CURRENCY_COUNTRIES);
        const currency = CURRENCY_OF[code];
        const options = pickOptions(code, SUPPORTED_COUNTRY_CODES, n, rng, c => !conflicting(CURRENCY_OF[c], currency));
        return { ask: 'geo.askCurrencyOf', prompt: { show: 'currency', code }, optionKind: 'country+flag', options, answer: code };
      }
      const code = fresh(SUPPORTED_COUNTRY_CODES);
      const answer = CURRENCY_OF[code];
      const options = pickOptions(answer, CURRENCIES, n, rng, (o, chosen) => chosen.every(c => !conflicting(o, c)));
      return { ask: 'geo.askCurrency', prompt: shownCountry(code), optionKind: 'currency', options, answer };
    }
    case 'car-logos': {
      // whose logo is it, or which logo is the brand's: at random
      const code = fresh(CAR_BRANDS);
      const options = choices(CAR_BRANDS, code, n, rng);
      return rng.next() < 0.5
        ? { ask: 'geo.askBrand', prompt: { show: 'logo', code }, optionKind: 'brand', options, answer: code }
        : { ask: 'geo.askLogo', prompt: { show: 'brand', code }, optionKind: 'logo', options, answer: code };
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
