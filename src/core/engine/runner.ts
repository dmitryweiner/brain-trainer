// Drives a GameEngine: applies events, keeps the platform timers in line with
// what engine.timers(state) asks for, and reports the outcome once.
import type { Scheduler, TimerHandle } from '../platform';
import { createRng, type Rng } from '../rng';
import type { GameEngine, SessionOutcome } from '../types';

export interface RunnerOptions {
  level: number;
  seed: number;
  variant?: string;
  onFinish?: (outcome: SessionOutcome, durationMs: number) => void;
}

export class EngineRunner<S, E> {
  private current: S;
  private readonly rng: Rng;
  private readonly startedAt: number;
  private readonly timers = new Map<string, { at: number; handle: TimerHandle }>();
  private readonly listeners = new Set<(state: S) => void>();
  private finished = false;
  private disposed = false;

  constructor(
    private readonly engine: GameEngine<S, E>,
    private readonly scheduler: Scheduler,
    private readonly options: RunnerOptions,
  ) {
    this.rng = createRng(options.seed);
    this.startedAt = scheduler.now();
    this.current = engine.init(options.level, { now: this.startedAt, rng: this.rng }, options.variant);
    this.afterChange();
  }

  get state(): S {
    return this.current;
  }

  subscribe(listener: (state: S) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(event: E): void {
    if (this.disposed || this.finished) return;
    const next = this.engine.reduce(this.current, event, { now: this.scheduler.now(), rng: this.rng });
    if (next === this.current) return;
    this.current = next;
    this.afterChange();
    for (const listener of this.listeners) listener(next);
  }

  /** Cancels pending timers; later events and timers are ignored. */
  dispose(): void {
    this.disposed = true;
    for (const { handle } of this.timers.values()) this.scheduler.clearTimeout(handle);
    this.timers.clear();
    this.listeners.clear();
  }

  private afterChange(): void {
    if (this.engine.isFinished(this.current)) {
      this.syncTimers([]);
      if (!this.finished) {
        this.finished = true;
        this.options.onFinish?.(this.engine.result(this.current), this.scheduler.now() - this.startedAt);
      }
      return;
    }
    this.syncTimers(this.engine.timers(this.current));
  }

  private syncTimers(wanted: { id: string; at: number; event: E }[]): void {
    const wantedIds = new Set(wanted.map(w => w.id));
    for (const [id, timer] of this.timers) {
      const keep = wanted.find(w => w.id === id);
      if (!wantedIds.has(id) || keep?.at !== timer.at) {
        this.scheduler.clearTimeout(timer.handle);
        this.timers.delete(id);
      }
    }
    const now = this.scheduler.now();
    for (const request of wanted) {
      if (this.timers.has(request.id)) continue;
      const handle = this.scheduler.setTimeout(() => {
        this.timers.delete(request.id);
        this.dispatch(request.event);
      }, Math.max(0, request.at - now));
      this.timers.set(request.id, { at: request.at, handle });
    }
  }
}
