// Hare Race (id reaction-click, PLAN-REACTION-CLICK.md): two hares on a start
// line, a pause, then the signal — a flag by day, a whistle by night — and the
// quicker one gets the carrot. A pure simple-reaction test against an opponent
// hare whose reaction time grows quicker with the level. 10 races, no lives.
//
// Earlier versions under the same id: v1 "tap when the screen turns green"
// (no metrics) and v2 "Dino Jump" (metrics.rules 2); their sessions keep
// their own ratings below.
import type { EngineContext, GameEngine, GameSession, SessionOutcome, TimerRequest } from '../../types';
import { average, clampLevel, counterCues } from '../common';

export const HARE_RACE = {
  races: 10,
  /** the wait on the start line: a truncated exponential over [minWaitMs, maxWaitMs] */
  minWaitMs: 1200,
  maxWaitMs: 5000,
  /** mean of the exponential part (above minWaitMs) */
  waitTailMs: 1500,
  /** no tap this long after the signal: asleep on the start line */
  timeoutMs: 1200,
  /** faster than this after the signal is a guess (the athletics rule) */
  anticipationMs: 100,
  reviewMs: 1200,
  /** spread of the opponent's time around its level's mean */
  opponentSpread: 0.08,
  winPoints: 10,
  /** wins in a row that double the points */
  comboStep: 3,
  /** metrics.rules of Hare Race sessions (v2 Dino Jump had 2) */
  rules: 3,
} as const;

export type Channel = 'visual' | 'audio';
export type HareVariant = Channel | 'mixed';
export const HARE_VARIANTS: readonly HareVariant[] = ['visual', 'audio', 'mixed'];

export type HarePhase = 'idle' | 'signal' | 'review' | 'done';
export type RaceResult = 'win' | 'lose' | 'falseStart' | 'timeout';

export interface Race {
  channel: Channel;
  opponentMs: number;
  /** the player's reaction; absent for a false start or a timeout */
  rt?: number;
  result: RaceResult;
}

export interface HareRaceState {
  phase: HarePhase;
  level: number;
  variant: HareVariant;
  /** channel of every race, planned by init */
  channels: Channel[];
  /** finished races */
  races: Race[];
  /** the race being run (idle, signal) or just finished (review) */
  current: { channel: Channel; opponentMs: number; signalAt: number; shown: boolean };
  /** idle: when the signal comes; review: when the next race starts */
  until: number;
  combo: number;
  maxCombo: number;
  score: number;
}

export type HareRaceEvent =
  /** timer: the wait on the start line is over */
  | { type: 'go' }
  /** UI: the signal really reached the screen or the speaker, at `at` */
  | { type: 'shown'; at?: number }
  /** the player's tap, timestamped by the input event */
  | { type: 'tap'; at?: number }
  /** timer: no tap after the signal */
  | { type: 'timeout' }
  /** timer: the finish is over */
  | { type: 'next' };

/** Mean reaction time of the opponent at a level */
export function opponentMeanMs(level: number): number {
  return 600 - 40 * (clampLevel(level) - 1);
}

export type OpponentId = 'sonya' | 'shustrik' | 'veterok' | 'molniya';

export function opponentOf(level: number): { id: OpponentId; icon: string } {
  const L = clampLevel(level);
  if (L <= 3) return { id: 'sonya', icon: '🐰' };
  if (L <= 6) return { id: 'shustrik', icon: '🐇' };
  if (L <= 9) return { id: 'veterok', icon: '🐰' };
  return { id: 'molniya', icon: '🏆' };
}

/**
 * The wait before the signal. Exponential, so the chance that the signal
 * comes in the next moment stays the same however long the player has
 * waited: with a uniform wait it is certain after the fourth second.
 */
export function waitMs(u: number): number {
  const range = HARE_RACE.maxWaitMs - HARE_RACE.minWaitMs;
  const m = HARE_RACE.waitTailMs;
  // inverse CDF of the exponential truncated to [0, range]
  return Math.round(HARE_RACE.minWaitMs - m * Math.log(1 - u * (1 - Math.exp(-range / m))));
}

export function racePoints(rt: number, combo: number): number {
  const bonus = rt < 250 ? 5 : rt < 350 ? 3 : rt < 500 ? 1 : 0;
  return (HARE_RACE.winPoints + bonus) * (combo >= HARE_RACE.comboStep ? 2 : 1);
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

function planChannels(variant: HareVariant, ctx: EngineContext): Channel[] {
  if (variant !== 'mixed') return Array.from({ length: HARE_RACE.races }, () => variant);
  const half = HARE_RACE.races / 2;
  return ctx.rng.shuffle([...Array<Channel>(half).fill('visual'), ...Array<Channel>(HARE_RACE.races - half).fill('audio')]);
}

function startRace(state: HareRaceState, ctx: EngineContext): HareRaceState {
  const mean = opponentMeanMs(state.level);
  const spread = (ctx.rng.next() * 2 - 1) * HARE_RACE.opponentSpread;
  return {
    ...state,
    phase: 'idle',
    current: { channel: state.channels[state.races.length], opponentMs: Math.round(mean * (1 + spread)), signalAt: 0, shown: false },
    until: ctx.now + waitMs(ctx.rng.next()),
  };
}

function finishRace(state: HareRaceState, race: Race, now: number): HareRaceState {
  const won = race.result === 'win';
  const combo = won ? state.combo + 1 : 0;
  return {
    ...state,
    phase: 'review',
    races: [...state.races, race],
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    score: state.score + (won ? racePoints(race.rt!, combo) : 0),
    until: now + HARE_RACE.reviewMs,
  };
}

const wins = (s: HareRaceState) => s.races.filter(r => r.result === 'win').length;

export const hareRaceEngine: GameEngine<HareRaceState, HareRaceEvent> = {
  init(level, ctx, variant) {
    const v = HARE_VARIANTS.includes(variant as HareVariant) ? (variant as HareVariant) : 'mixed';
    const state: HareRaceState = {
      phase: 'idle', level: clampLevel(level), variant: v, channels: planChannels(v, ctx), races: [],
      current: { channel: 'visual', opponentMs: 0, signalAt: 0, shown: false }, until: 0, combo: 0, maxCombo: 0, score: 0,
    };
    return startRace(state, ctx);
  },

  reduce(state, event, ctx) {
    const { current } = state;
    switch (event.type) {
      case 'go':
        return state.phase === 'idle' ? { ...state, phase: 'signal', current: { ...current, signalAt: ctx.now } } : state;
      case 'shown':
        if (state.phase !== 'signal' || current.shown) return state;
        return { ...state, current: { ...current, signalAt: event.at ?? ctx.now, shown: true } };
      case 'tap': {
        const base = { channel: current.channel, opponentMs: current.opponentMs };
        if (state.phase === 'idle') return finishRace(state, { ...base, result: 'falseStart' }, ctx.now);
        if (state.phase !== 'signal') return state;
        const rt = Math.round((event.at ?? ctx.now) - current.signalAt);
        // quicker than humanly possible: a guess, counted as a false start
        if (rt < HARE_RACE.anticipationMs) return finishRace(state, { ...base, result: 'falseStart' }, ctx.now);
        return finishRace(state, { ...base, rt, result: rt < current.opponentMs ? 'win' : 'lose' }, ctx.now);
      }
      case 'timeout':
        return state.phase === 'signal'
          ? finishRace(state, { channel: current.channel, opponentMs: current.opponentMs, result: 'timeout' }, ctx.now)
          : state;
      case 'next':
        if (state.phase !== 'review') return state;
        return state.races.length >= HARE_RACE.races ? { ...state, phase: 'done' } : startRace(state, ctx);
    }
  },

  timers(state): TimerRequest<HareRaceEvent>[] {
    const n = state.races.length;
    if (state.phase === 'idle') return [{ id: `go-${n}`, at: state.until, event: { type: 'go' } }];
    // the signal moves when the UI reports it shown: the timer moves with it
    if (state.phase === 'signal') return [{ id: `timeout-${n}`, at: state.current.signalAt + HARE_RACE.timeoutMs, event: { type: 'timeout' } }];
    if (state.phase === 'review') return [{ id: `next-${n}`, at: state.until, event: { type: 'next' } }];
    return [];
  },

  // races end only on a tap or a timeout: the cues never sound before the tap
  cues: counterCues<HareRaceState>(wins, s => s.races.length - wins(s)),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const { races } = state;
    const times = races.flatMap(r => (r.rt === undefined ? [] : [r.rt]));
    const of = (channel: Channel) => races.flatMap(r => (r.channel === channel && r.rt !== undefined ? [r.rt] : []));
    const visual = of('visual');
    const audio = of('audio');
    const won = wins(state);
    const metrics: Record<string, number> = {
      wins: won,
      races: races.length,
      falseStarts: races.filter(r => r.result === 'falseStart').length,
      timeouts: races.filter(r => r.result === 'timeout').length,
      opponentMs: opponentMeanMs(state.level),
      maxCombo: state.maxCombo,
      rules: HARE_RACE.rules,
    };
    if (times.length > 0) {
      metrics.medianMs = median(times);
      metrics.bestReactionMs = Math.min(...times);
    }
    if (visual.length > 0) {
      metrics.visualMedianMs = median(visual);
      metrics.bestVisualMs = Math.min(...visual);
    }
    if (audio.length > 0) {
      metrics.audioMedianMs = median(audio);
      metrics.bestAudioMs = Math.min(...audio);
    }
    return {
      score: state.score,
      accuracy: races.length > 0 ? Math.round((won / races.length) * 100) : 0,
      avgTimeMs: average(times),
      metrics,
    };
  },
};

/** ≥ 7 wins of 10: a quicker opponent; ≤ 4: a slower one. Older versions keep the accuracy rule. */
export function hareRaceLevelStep(session: Pick<GameSession, 'metrics'>): number | undefined {
  const m = session.metrics;
  if (m.rules !== HARE_RACE.rules) return undefined;
  return m.wins >= 7 ? 1 : m.wins <= 4 ? -1 : 0;
}

/** Raw-score maximum of the v1 game (5 attempts × 5 points) */
const V1_MAX_SCORE = 25;
/** metrics.rules of v2 (Dino Jump: 10 obstacles, 3 lives) */
const V2_RULES = 2;
const V2_ATTEMPTS = 10;
const FASTEST_MS = 200;
const SLOWEST_MS = 1000;

function speed(ms: number): number {
  return Math.min(1, Math.max(0, (SLOWEST_MS - ms) / (SLOWEST_MS - FASTEST_MS)));
}

/** Speed is the skill: the level adds at most 13.5% */
function levelFactor(level: number): number {
  return 0.85 + 0.015 * clampLevel(level);
}

/**
 * Share of clean races (no false start, no timeout) × speed of the median
 * reaction × a small level factor: 200 ms or faster at level 10 is 1000.
 * Older sessions keep their formulas: v2 by its average and clean attempts,
 * v1 (no metrics) by its points (25 ≈ all attempts at about 250 ms).
 */
export function reactionClickRating(outcome: SessionOutcome, level: number): number {
  const m = outcome.metrics;
  if (m.rules === HARE_RACE.rules) {
    const clean = m.races - m.falseStarts - m.timeouts;
    return (clean / HARE_RACE.races) * speed(m.medianMs ?? SLOWEST_MS) * 1000 * levelFactor(level);
  }
  if (m.hits === undefined) return (outcome.score / V1_MAX_SCORE) * speed(250) * 1000 * levelFactor(level);
  const attempts = m.attempts ?? 5;
  // running out of lives early counts the unplayed attempts as misses
  const share = m.hits / Math.max(attempts, m.rules === V2_RULES ? V2_ATTEMPTS : attempts);
  return share * speed(outcome.avgTimeMs) * 1000 * levelFactor(level);
}
