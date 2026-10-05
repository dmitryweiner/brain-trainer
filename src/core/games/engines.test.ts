import { describe, it, expect } from 'vitest';
import { createRng } from '../rng';
import type { EngineContext } from '../types';
import { reactionClickEngine, reactionPoints, REACTION_CLICK } from './reactionClick/engine';
import { oddOneOutEngine, difficultyForRound, ODD_ONE_OUT } from './oddOneOut/engine';

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
  it('grows the grid with the round', () => {
    expect([0, 2, 3, 6, 7, 9].map(difficultyForRound)).toEqual(['easy', 'easy', 'medium', 'medium', 'hard', 'hard']);
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
    // correct in rounds 1,3,5 (3×3, 3×3, 4×4), 7 (4×4), 9 (5×5)
    expect(outcome.score).toBe(3 + 3 + 4 + 4 + 5);
    expect(outcome.accuracy).toBe(50);
    expect(outcome.avgTimeMs).toBe(500);
    expect(outcome.metrics).toEqual({ correct: 5, rounds: 10, maxGridSize: 5 });
  });

  it('ignores picks outside the grid and during feedback', () => {
    let s = oddOneOutEngine.init(1, ctxAt(0));
    expect(oddOneOutEngine.reduce(s, { type: 'pick', index: 99 }, ctxAt(1))).toBe(s);
    s = oddOneOutEngine.reduce(s, { type: 'pick', index: 0 }, ctxAt(1));
    expect(oddOneOutEngine.reduce(s, { type: 'pick', index: 0 }, ctxAt(2))).toBe(s);
  });
});
