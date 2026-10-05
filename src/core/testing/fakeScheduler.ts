// Deterministic Scheduler for tests: time moves only through advance().
import type { Scheduler, TimerHandle } from '../platform';

export class FakeScheduler implements Scheduler {
  private time = 0;
  private seq = 0;
  private pending = new Map<number, { at: number; callback: () => void }>();

  now(): number {
    return this.time;
  }

  setTimeout(callback: () => void, delayMs: number): TimerHandle {
    const id = ++this.seq;
    this.pending.set(id, { at: this.time + Math.max(0, delayMs), callback });
    return id;
  }

  clearTimeout(handle: TimerHandle): void {
    this.pending.delete(handle as number);
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  /** Moves the clock forward, firing due timers in time order. */
  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      let nextId: number | null = null;
      let nextAt = Infinity;
      for (const [id, t] of this.pending) {
        if (t.at <= target && t.at < nextAt) {
          nextAt = t.at;
          nextId = id;
        }
      }
      if (nextId === null) break;
      const timer = this.pending.get(nextId)!;
      this.pending.delete(nextId);
      this.time = timer.at;
      timer.callback();
    }
    this.time = target;
  }

  /** Fires timers until none are left (bounded to catch runaway loops). */
  runAll(maxSteps = 10_000): void {
    for (let i = 0; i < maxSteps && this.pending.size > 0; i++) {
      const nextAt = Math.min(...[...this.pending.values()].map(t => t.at));
      this.advance(nextAt - this.time);
    }
  }
}
