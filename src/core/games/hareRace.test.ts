import { describe, it, expect } from 'vitest';
import { createRng } from '../rng';
import type { EngineContext, GameSession } from '../types';
import {
  HARE_RACE, hareRaceEngine, hareRaceLevelStep, median, opponentMeanMs, opponentOf, racePoints, reactionClickRating, waitMs,
  type HareRaceState,
} from './reactionClick/engine';
import { normalizeSession } from './registry';

const ctxAt = (now: number, seed = 1): EngineContext => ({ now, rng: createRng(seed) });
const { reduce } = hareRaceEngine;

/** The signal of the current race, at `at` */
function signal(s: HareRaceState, at = s.until): HareRaceState {
  return reduce(s, { type: 'go' }, ctxAt(at));
}

/** One race tapped `rt` ms after the signal, through to the next race */
function race(s: HareRaceState, rt: number): HareRaceState {
  s = signal(s);
  s = reduce(s, { type: 'tap', at: s.current.signalAt + rt }, ctxAt(s.current.signalAt + rt + 5));
  return reduce(s, { type: 'next' }, ctxAt(s.until));
}

describe('hareRaceEngine', () => {
  it('waits 1.2–5 s on the start line, exponentially (no moment where the signal is certain)', () => {
    const rng = createRng(42);
    const waits = Array.from({ length: 10_000 }, () => waitMs(rng.next()));
    expect(Math.min(...waits)).toBeGreaterThanOrEqual(HARE_RACE.minWaitMs);
    expect(Math.max(...waits)).toBeLessThanOrEqual(HARE_RACE.maxWaitMs);
    // 1.2 s + the exponential tail (mean 1.5 s, truncated at 5 s)
    const mean = waits.reduce((a, b) => a + b, 0) / waits.length;
    expect(mean).toBeGreaterThan(2300);
    expect(mean).toBeLessThan(2450);
    // constant hazard: half of the remaining waits end within the same span, early or late
    const share = (from: number, to: number) => waits.filter(w => w >= from && w < to).length / waits.filter(w => w >= from).length;
    expect(Math.abs(share(1200, 1700) - share(2200, 2700))).toBeLessThan(0.05);
    expect(waitMs(0)).toBe(HARE_RACE.minWaitMs);
    expect(waitMs(0.999999)).toBeLessThanOrEqual(HARE_RACE.maxWaitMs);
  });

  it('a tap before the signal is a false start: no points, the streak is lost', () => {
    let s = hareRaceEngine.init(1, ctxAt(0), 'visual');
    for (let i = 0; i < 3; i++) s = race(s, 300);
    expect(s.combo).toBe(3);
    const score = s.score;
    s = reduce(s, { type: 'tap', at: 100 }, ctxAt(s.until - 500));
    expect(s).toMatchObject({ phase: 'review', combo: 0, score });
    expect(s.races[s.races.length - 1]).toEqual({ channel: 'visual', opponentMs: expect.any(Number), result: 'falseStart' });
    // the finish ignores further taps
    expect(reduce(s, { type: 'tap' }, ctxAt(s.until - 100))).toBe(s);
  });

  it('measures from the moment the signal was shown, by the input event time', () => {
    let s = signal(hareRaceEngine.init(1, ctxAt(0), 'visual'), 2000);
    expect(s.current.signalAt).toBe(2000);
    // the flag reached the screen 30 ms after the timer
    s = reduce(s, { type: 'shown', at: 2030 }, ctxAt(2040));
    expect(s.current).toMatchObject({ signalAt: 2030, shown: true });
    // a second report changes nothing
    expect(reduce(s, { type: 'shown', at: 2100 }, ctxAt(2100))).toBe(s);
    expect(hareRaceEngine.timers(s)).toEqual([{ id: 'timeout-0', at: 2030 + HARE_RACE.timeoutMs, event: { type: 'timeout' } }]);
    // the tap happened at 2310, its handler ran later
    s = reduce(s, { type: 'tap', at: 2310 }, ctxAt(2380));
    expect(s.races[0].rt).toBe(280);
  });

  it('a tap within 100 ms of the signal is a guess: lost, not recorded', () => {
    let s = signal(hareRaceEngine.init(1, ctxAt(0), 'visual'), 2000);
    s = reduce(s, { type: 'tap', at: 2099 }, ctxAt(2099));
    expect(s.races[0]).toEqual({ channel: 'visual', opponentMs: expect.any(Number), result: 'falseStart' });
    expect(hareRaceEngine.result({ ...s, phase: 'done' }).metrics).toMatchObject({ falseStarts: 1, races: 1 });
    expect(hareRaceEngine.result({ ...s, phase: 'done' }).metrics.medianMs).toBeUndefined();
  });

  it('wins when quicker than the opponent; a timeout is asleep on the start line', () => {
    let s = signal(hareRaceEngine.init(1, ctxAt(0), 'visual'), 2000);
    const { opponentMs } = s.current;
    const win = reduce(s, { type: 'tap', at: 2000 + opponentMs - 1 }, ctxAt(3000));
    expect(win.races[0].result).toBe('win');
    expect(win.score).toBe(racePoints(opponentMs - 1, 1));
    const lose = reduce(s, { type: 'tap', at: 2000 + opponentMs }, ctxAt(3000));
    expect(lose.races[0]).toMatchObject({ result: 'lose', rt: opponentMs });
    expect(lose.score).toBe(0);

    s = reduce(s, { type: 'timeout' }, ctxAt(2000 + HARE_RACE.timeoutMs));
    expect(s.races[0]).toEqual({ channel: 'visual', opponentMs, result: 'timeout' });
    expect(hareRaceEngine.result({ ...s, phase: 'done' }).metrics.timeouts).toBe(1);
  });

  it('scores 10 a win plus a speed bonus, doubled from the third win in a row', () => {
    expect([200, 300, 400, 600].map(rt => racePoints(rt, 1))).toEqual([15, 13, 11, 10]);
    expect(racePoints(300, 3)).toBe(26);
    let s = hareRaceEngine.init(1, ctxAt(0), 'visual');
    for (let i = 0; i < HARE_RACE.races; i++) s = race(s, 240);
    expect(s.phase).toBe('done');
    expect(s.score).toBe(2 * 15 + 8 * 30);
    expect(s.maxCombo).toBe(10);
  });

  it('plans 5 day and 5 night races when mixed, all of one channel otherwise', () => {
    for (let seed = 1; seed < 20; seed++) {
      const mixed = hareRaceEngine.init(1, ctxAt(0, seed), 'mixed');
      expect(mixed.channels.filter(c => c === 'audio')).toHaveLength(5);
      expect(mixed.channels).toHaveLength(10);
    }
    expect(new Set(hareRaceEngine.init(1, ctxAt(0), 'audio').channels)).toEqual(new Set(['audio']));
    expect(new Set(hareRaceEngine.init(1, ctxAt(0), 'visual').channels)).toEqual(new Set(['visual']));
    expect(hareRaceEngine.init(1, ctxAt(0)).variant).toBe('mixed');
  });

  it('the opponent reacts within 8% of its level mean, quicker with each level', () => {
    expect([1, 4, 10].map(opponentMeanMs)).toEqual([600, 480, 240]);
    expect([1, 3, 4, 7, 10].map(l => opponentOf(l).id)).toEqual(['sonya', 'sonya', 'shustrik', 'veterok', 'molniya']);
    for (let seed = 1; seed < 50; seed++) {
      const { opponentMs } = hareRaceEngine.init(5, ctxAt(0, seed)).current;
      expect(Math.abs(opponentMs - 440)).toBeLessThanOrEqual(440 * 0.08 + 1);
    }
  });

  it('reports medians per channel', () => {
    let s = hareRaceEngine.init(1, ctxAt(0), 'mixed');
    s = { ...s, channels: [...Array(5).fill('visual'), ...Array(5).fill('audio')] };
    s = { ...s, current: { ...s.current, channel: 'visual' } };
    for (const rt of [200, 300, 400, 500, 250, 150, 160, 170, 180, 900]) s = race(s, rt);
    const { metrics, accuracy, avgTimeMs } = hareRaceEngine.result(s);
    expect(metrics).toMatchObject({
      visualMedianMs: 300, bestVisualMs: 200, audioMedianMs: 170, bestAudioMs: 150,
      medianMs: 225, bestReactionMs: 150, races: 10, wins: 9, rules: HARE_RACE.rules, opponentMs: 600,
    });
    expect(accuracy).toBe(90);
    expect(avgTimeMs).toBe(321);
    expect(median([3, 1, 2])).toBe(2);
  });
});

describe('hareRaceLevelStep', () => {
  const step = (metrics: Record<string, number>) => hareRaceLevelStep({ metrics });
  it('moves by wins: 7+ up, 4 or fewer down', () => {
    expect([7, 10, 6, 5, 4, 0].map(wins => step({ wins, rules: HARE_RACE.rules }))).toEqual([1, 1, 0, 0, -1, -1]);
    // older versions keep the accuracy rule
    expect(step({ hits: 10, rules: 2 })).toBeUndefined();
  });
});

describe('reactionClickRating', () => {
  const r = (metrics: Record<string, number>, avgTimeMs: number, level = 10) =>
    reactionClickRating({ score: 0, accuracy: 0, avgTimeMs, metrics }, level);
  const hare = { races: 10, falseStarts: 0, timeouts: 0, rules: HARE_RACE.rules };

  it('rates clean races × speed of the median × a small level factor', () => {
    expect(r({ ...hare, medianMs: 200 }, 999)).toBeCloseTo(1000);
    expect(r({ ...hare, medianMs: 600 }, 200)).toBeCloseTo(500);
    expect(r({ ...hare, medianMs: 200, falseStarts: 3, timeouts: 1 }, 200)).toBeCloseTo(600);
    expect(r({ ...hare, medianMs: 300 }, 300)).toBeGreaterThan(r({ ...hare, medianMs: 350 }, 300));
    expect(r({ ...hare, medianMs: 300 }, 300, 5)).toBeGreaterThan(r({ ...hare, medianMs: 300 }, 300, 4));
    expect(r({ ...hare, races: 10, falseStarts: 10 }, 0)).toBe(0);
  });

  it('keeps the ratings of Dino Jump (v2) and the v1 game', () => {
    const v2 = { hits: 10, attempts: 10, rules: 2 };
    expect(r(v2, 200)).toBeCloseTo(1000);
    expect(r(v2, 600)).toBeCloseTo(500);
    expect(r(v2, 200, 1)).toBeCloseTo(865);
    // ran out of lives after 7 attempts
    expect(r({ hits: 4, attempts: 7, rules: 2 }, 200)).toBeCloseTo(400);
    // stage 2: 5 attempts, no rules marker
    expect(r({ hits: 5 }, 200, 1)).toBeCloseTo(865);
    // v1: points only
    expect(reactionClickRating({ score: 25, accuracy: 100, avgTimeMs: 0, metrics: {} }, 1)).toBeCloseTo(937.5 * 0.865);
  });

  it('rates stored sessions of every version through the registry', () => {
    const stored = (metrics: Record<string, number>, avgTimeMs: number, score = 0): GameSession => ({
      id: 'x', gameId: 'reaction-click', schemaVersion: 2, startedAt: 0, durationMs: 0, level: 1, score, rating: 0, accuracy: 0, avgTimeMs, metrics,
    });
    expect(normalizeSession(stored({ hits: 10, attempts: 10, rules: 2 }, 600)).rating).toBe(433);
    expect(normalizeSession(stored({}, 0, 25)).rating).toBe(811);
    expect(normalizeSession(stored({ ...hare, medianMs: 400 }, 450)).rating).toBe(649);
  });
});
