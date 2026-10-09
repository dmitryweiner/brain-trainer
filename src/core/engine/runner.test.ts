import { describe, it, expect, vi } from 'vitest';
import { EngineRunner } from './runner';
import { FakeScheduler } from '../testing/fakeScheduler';
import { hareRaceEngine, HARE_RACE } from '../games/reactionClick/engine';
import type { GameEngine } from '../types';

describe('EngineRunner', () => {
  it('fires the timers the engine asks for and finishes once', () => {
    const scheduler = new FakeScheduler();
    const onFinish = vi.fn();
    const runner = new EngineRunner(hareRaceEngine, scheduler, { level: 1, seed: 7, variant: 'visual', onFinish });

    for (let i = 0; i < HARE_RACE.races; i++) {
      expect(runner.state.phase).toBe('idle');
      scheduler.advance(runner.state.until - scheduler.now());
      expect(runner.state.phase).toBe('signal');
      scheduler.advance(250);
      runner.dispatch({ type: 'tap' });
      expect(runner.state.phase).toBe('review');
      scheduler.advance(HARE_RACE.reviewMs);
    }

    expect(runner.state.phase).toBe('done');
    expect(onFinish).toHaveBeenCalledTimes(1);
    const [outcome, durationMs] = onFinish.mock.calls[0];
    // 10 + 3 for each win, doubled from the third in a row
    expect(outcome.score).toBe(13 * 18);
    expect(outcome.metrics.bestReactionMs).toBe(250);
    expect(durationMs).toBe(scheduler.now());
    expect(scheduler.pendingCount).toBe(0);

    runner.dispatch({ type: 'tap' });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('cancels a timer the new state no longer wants', () => {
    const scheduler = new FakeScheduler();
    const runner = new EngineRunner(hareRaceEngine, scheduler, { level: 1, seed: 1 });
    expect(scheduler.pendingCount).toBe(1); // the "go" signal

    runner.dispatch({ type: 'tap' }); // false start
    expect(runner.state.races[0].result).toBe('falseStart');
    expect(scheduler.pendingCount).toBe(1); // only "next"; "go" was cancelled

    scheduler.advance(HARE_RACE.reviewMs);
    expect(runner.state.phase).toBe('idle');
    expect(runner.state.races).toHaveLength(1);
  });

  it('notifies subscribers and stops after dispose', () => {
    const scheduler = new FakeScheduler();
    const runner = new EngineRunner(hareRaceEngine, scheduler, { level: 1, seed: 3 });
    const listener = vi.fn();
    runner.subscribe(listener);

    scheduler.advance(runner.state.until);
    expect(listener).toHaveBeenCalledTimes(1);

    runner.dispose();
    expect(scheduler.pendingCount).toBe(0);
    runner.dispatch({ type: 'tap' });
    expect(runner.state.phase).toBe('signal');
  });

  it('keeps a running timer when the engine re-requests it unchanged', () => {
    type S = { n: number; done: boolean };
    type E = { type: 'bump' } | { type: 'end' };
    const engine: GameEngine<S, E> = {
      init: () => ({ n: 0, done: false }),
      reduce: (s, e) => (e.type === 'bump' ? { ...s, n: s.n + 1 } : { ...s, done: true }),
      timers: () => [{ id: 'end', at: 1000, event: { type: 'end' } }],
      isFinished: s => s.done,
      result: s => ({ score: s.n, accuracy: 100, avgTimeMs: 0, metrics: {} }),
    };
    const scheduler = new FakeScheduler();
    const setTimeoutSpy = vi.spyOn(scheduler, 'setTimeout');
    const runner = new EngineRunner(engine, scheduler, { level: 1, seed: 1 });

    scheduler.advance(400);
    runner.dispatch({ type: 'bump' });
    runner.dispatch({ type: 'bump' });
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    scheduler.advance(600);
    expect(runner.state).toEqual({ n: 2, done: true });
  });
});
