import { describe, it, expect } from 'vitest';
import { createRng } from '../rng';
import type { EngineContext } from '../types';
import { reactionClickEngine, reactionClickRating, reactionPoints, REACTION_CLICK } from './reactionClick/engine';
import {
  oddOneOutEngine, difficultyFor, gridSizeFor, oddOneOutRating, levelCeiling, ODD_ONE_OUT, V1_EQUIVALENT_LEVEL,
} from './oddOneOut/engine';
import { normalizeSession } from './registry';

const ctxAt = (now: number, seed = 1): EngineContext => ({ now, rng: createRng(seed) });

describe('reactionClickEngine', () => {
  it('scores reaction times by bands', () => {
    expect(reactionPoints(299)).toBe(5);
    expect(reactionPoints(300)).toBe(3);
    expect(reactionPoints(500)).toBe(2);
    expect(reactionPoints(800)).toBe(1);
  });

  it('waits a random 1–4 s before the signal', () => {
    for (let seed = 1; seed < 50; seed++) {
      const s = reactionClickEngine.init(1, ctxAt(0, seed));
      expect(s.until).toBeGreaterThanOrEqual(REACTION_CLICK.minDelayMs);
      expect(s.until).toBeLessThanOrEqual(REACTION_CLICK.maxDelayMs);
    }
  });

  it('counts a false start as a used attempt with no time', () => {
    const ctx = ctxAt(0);
    let s = reactionClickEngine.init(1, ctx);
    s = reactionClickEngine.reduce(s, { type: 'tap' }, ctxAt(100));
    expect(s.phase).toBe('tooEarly');
    expect(s.attempt).toBe(1);
    expect(s.falseStarts).toBe(1);
    expect(s.reactionTimes).toEqual([]);
  });

  it('ignores taps during feedback', () => {
    let s = reactionClickEngine.init(1, ctxAt(0));
    s = reactionClickEngine.reduce(s, { type: 'tap' }, ctxAt(10));
    const again = reactionClickEngine.reduce(s, { type: 'tap' }, ctxAt(20));
    expect(again).toBe(s);
  });

  it('reports accuracy, average and best/worst times', () => {
    const outcome = reactionClickEngine.result({
      phase: 'done', attempt: 5, reactionTimes: [200, 400, 600], score: 10, falseStarts: 2, until: 0, readyAt: 0,
    });
    expect(outcome).toEqual({
      score: 10,
      accuracy: 60,
      avgTimeMs: 400,
      metrics: { falseStarts: 2, hits: 3, bestReactionMs: 200, worstReactionMs: 600 },
    });
  });
});

describe('oddOneOutEngine', () => {
  it('sets grid and pair difficulty by level, growing within the session', () => {
    expect([0, 4, 5, 9].map(r => gridSizeFor(1, r))).toEqual([3, 3, 4, 4]);
    expect([0, 9].map(r => gridSizeFor(4, r))).toEqual([4, 5]);
    expect([0, 9].map(r => gridSizeFor(10, r))).toEqual([6, 6]);
    expect([0, 6, 7].map(r => difficultyFor(1, r))).toEqual(['easy', 'easy', 'medium']);
    expect([0, 7].map(r => difficultyFor(4, r))).toEqual(['medium', 'hard']);
    expect(difficultyFor(10, 0)).toBe('hard');
  });

  it('starts at the given level, clamped to 1–10', () => {
    expect(oddOneOutEngine.init(7, ctxAt(0)).gridSize).toBe(5);
    expect(oddOneOutEngine.init(99, ctxAt(0)).level).toBe(10);
    expect(oddOneOutEngine.init(0, ctxAt(0)).level).toBe(1);
  });

  it('deals one odd emoji in a full grid', () => {
    const s = oddOneOutEngine.init(1, ctxAt(0, 42));
    expect(s.grid).toHaveLength(9);
    const odd = s.grid[s.oddIndex];
    expect(s.grid.filter(e => e === odd)).toHaveLength(1);
    expect(new Set(s.grid).size).toBe(2);
  });

  it('is reproducible from the seed', () => {
    expect(oddOneOutEngine.init(1, ctxAt(0, 5))).toEqual(oddOneOutEngine.init(1, ctxAt(0, 5)));
  });

  it('plays a full session', () => {
    const rngCtx = ctxAt(0, 9);
    let s = oddOneOutEngine.init(1, rngCtx);
    let now = 0;
    for (let round = 0; round < ODD_ONE_OUT.rounds; round++) {
      now += 500;
      const pick = round % 2 === 0 ? s.oddIndex : (s.oddIndex + 1) % s.grid.length;
      s = oddOneOutEngine.reduce(s, { type: 'pick', index: pick }, { ...rngCtx, now });
      expect(s.phase).toBe('feedback');
      expect(oddOneOutEngine.timers(s)).toHaveLength(1);
      now += ODD_ONE_OUT.feedbackMs;
      s = oddOneOutEngine.reduce(s, { type: 'next' }, { ...rngCtx, now });
    }
    expect(oddOneOutEngine.isFinished(s)).toBe(true);
    const outcome = oddOneOutEngine.result(s);
    // level 1: correct in rounds 1, 3, 5 (3×3) and 7, 9 (4×4)
    expect(outcome.score).toBe(3 + 3 + 3 + 4 + 4);
    expect(outcome.accuracy).toBe(50);
    expect(outcome.avgTimeMs).toBe(500);
    expect(outcome.metrics).toEqual({ correct: 5, rounds: 10, maxGridSize: 4, rules: ODD_ONE_OUT.rules });
  });

  it('ignores picks outside the grid and during feedback', () => {
    let s = oddOneOutEngine.init(1, ctxAt(0));
    expect(oddOneOutEngine.reduce(s, { type: 'pick', index: 99 }, ctxAt(1))).toBe(s);
    s = oddOneOutEngine.reduce(s, { type: 'pick', index: 0 }, ctxAt(1));
    expect(oddOneOutEngine.reduce(s, { type: 'pick', index: 0 }, ctxAt(2))).toBe(s);
  });

  it('rates by accuracy, level and speed', () => {
    const at = (accuracy: number, avgTimeMs: number, level: number) =>
      oddOneOutRating({ score: 0, accuracy, avgTimeMs, metrics: { correct: 1, rules: ODD_ONE_OUT.rules } }, level);
    expect(at(100, 1000, 10)).toBe(1000);
    expect(at(100, 1000, 1)).toBe(levelCeiling(1));
    expect(at(50, 1000, 10)).toBe(500);
    expect(at(100, 5000, 10)).toBeCloseTo(700);
    expect(at(100, 3250, 10)).toBeCloseTo(850);
  });

  it('counts v1 and stage-1 sessions at the v1-equivalent level', () => {
    const stored = (metrics: Record<string, number>, score = 40) => ({
      id: 'x', gameId: 'odd-one-out' as const, schemaVersion: 2 as const, startedAt: 1, durationMs: 0,
      level: 1, score, rating: 0, accuracy: 100, avgTimeMs: 900, metrics,
    });
    // v1 history: no metrics, raw score against the v1 maximum
    expect(normalizeSession(stored({}))).toMatchObject({ level: V1_EQUIVALENT_LEVEL, rating: levelCeiling(4) });
    expect(normalizeSession(stored({}, 20)).rating).toBe(levelCeiling(4) / 2);
    // stage 1 played the v1 layout, recorded level 1 and had no rules marker
    expect(normalizeSession(stored({ correct: 10, maxGridSize: 5 }))).toMatchObject({ level: 4, rating: levelCeiling(4) });
    // sessions with levels keep theirs
    expect(normalizeSession({ ...stored({ correct: 10, rules: ODD_ONE_OUT.rules }), level: 7 })).toMatchObject({ level: 7, rating: levelCeiling(7) });
  });
});

describe('reactionClickRating', () => {
  it('multiplies clean-attempt share by speed', () => {
    const r = (hits: number, avgTimeMs: number) => reactionClickRating({ score: 0, accuracy: 0, avgTimeMs, metrics: { hits } });
    expect(r(5, 200)).toBe(1000);
    expect(r(5, 1000)).toBe(0);
    expect(r(5, 600)).toBe(500);
    expect(r(3, 200)).toBe(600);
    expect(r(0, 0)).toBe(0);
  });

  it('maps v1 points onto the same scale', () => {
    expect(reactionClickRating({ score: 25, accuracy: 100, avgTimeMs: 0, metrics: {} })).toBeCloseTo(937.5);
  });
});
