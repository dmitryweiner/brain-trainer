// Track the dot: keep a finger on a target that glides around for 30 s.
// The target's path is a sum of sine waves fixed at the start, so the view
// can draw it at any moment and the engine can check it at each tick. The
// level speeds it up and shrinks it.
import type { Cue, EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { clampLevel, levelCeiling, percent } from '../common';

export const TRACK_DOT = {
  sessionMs: 30_000,
  tickMs: 100,
  leadInMs: 1500,
} as const;

interface Wave {
  amp: number;
  freq: number;
  phase: number;
}

export interface DotPath {
  x: Wave[];
  y: Wave[];
}

export function dotLayout(level: number): { radius: number; tolerance: number; baseFreq: number } {
  const L = clampLevel(level);
  const radius = Math.max(4.5, 9 - 0.45 * L);
  return { radius, tolerance: radius * 1.5, baseFreq: 0.06 + 0.025 * L };
}

function waves(rng: Rng, baseFreq: number): Wave[] {
  // amplitudes sum to 36: the dot stays within 14…86
  return [
    { amp: 22, freq: baseFreq * (0.8 + rng.next() * 0.4), phase: rng.next() * 2 * Math.PI },
    { amp: 10, freq: baseFreq * (1.7 + rng.next() * 0.6), phase: rng.next() * 2 * Math.PI },
    { amp: 4, freq: baseFreq * (3.1 + rng.next()), phase: rng.next() * 2 * Math.PI },
  ];
}

export function makeDotPath(level: number, rng: Rng): DotPath {
  const { baseFreq } = dotLayout(level);
  return { x: waves(rng, baseFreq), y: waves(rng, baseFreq) };
}

/** Where the target is `ms` after the start (0–100 box) */
export function dotAt(path: DotPath, ms: number): { x: number; y: number } {
  const t = Math.max(0, ms) / 1000;
  const sum = (ws: Wave[]) => 50 + ws.reduce((a, w) => a + w.amp * Math.sin(2 * Math.PI * w.freq * t + w.phase), 0);
  return { x: sum(path.x), y: sum(path.y) };
}

export interface TrackDotState {
  phase: 'leadIn' | 'playing' | 'done';
  level: number;
  path: DotPath;
  radius: number;
  tolerance: number;
  /** when the target starts moving (clock of the scheduler) */
  movingAt: number;
  endsAt: number;
  pointer: { x: number; y: number } | null;
  onTarget: boolean;
  ticks: number;
  onTicks: number;
  holdTicks: number;
  longestHoldTicks: number;
  nextTickAt: number;
}

export type TrackDotEvent =
  | { type: 'pointer'; x: number; y: number }
  | { type: 'lift' }
  | { type: 'tick' }
  | { type: 'go' };

export const trackDotEngine: GameEngine<TrackDotState, TrackDotEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const { radius, tolerance } = dotLayout(L);
    const movingAt = ctx.now + TRACK_DOT.leadInMs;
    return {
      phase: 'leadIn', level: L, path: makeDotPath(L, ctx.rng), radius, tolerance, movingAt,
      endsAt: movingAt + TRACK_DOT.sessionMs, pointer: null, onTarget: false, ticks: 0, onTicks: 0,
      holdTicks: 0, longestHoldTicks: 0, nextTickAt: movingAt,
    };
  },

  reduce(state, event, ctx) {
    if (state.phase === 'done') return state;
    switch (event.type) {
      case 'pointer':
        return { ...state, pointer: { x: event.x, y: event.y } };
      case 'lift':
        return { ...state, pointer: null };
      case 'go':
        return state.phase === 'leadIn' ? { ...state, phase: 'playing' } : state;
      case 'tick': {
        if (state.phase !== 'playing') return state;
        const at = dotAt(state.path, ctx.now - state.movingAt);
        const on = state.pointer !== null && Math.hypot(state.pointer.x - at.x, state.pointer.y - at.y) <= state.tolerance;
        const holdTicks = on ? state.holdTicks + 1 : 0;
        const next: TrackDotState = {
          ...state,
          onTarget: on,
          ticks: state.ticks + 1,
          onTicks: state.onTicks + (on ? 1 : 0),
          holdTicks,
          longestHoldTicks: Math.max(state.longestHoldTicks, holdTicks),
          nextTickAt: state.nextTickAt + TRACK_DOT.tickMs,
        };
        return next.nextTickAt > state.endsAt ? { ...next, phase: 'done' } : next;
      }
    }
  },

  timers(state): TimerRequest<TrackDotEvent>[] {
    if (state.phase === 'leadIn') return [{ id: 'go', at: state.movingAt, event: { type: 'go' } }];
    if (state.phase === 'playing') return [{ id: `tick-${state.ticks}`, at: state.nextTickAt, event: { type: 'tick' } }];
    return [];
  },

  // a soft chime for every 3 s spent on the target, a buzz the moment it is lost
  cues(prev, next) {
    const cues: Cue[] = [];
    if (Math.floor(next.onTicks / 30) > Math.floor(prev.onTicks / 30)) cues.push('good');
    if (prev.onTarget && !next.onTarget && next.phase === 'playing') cues.push('bad');
    return cues;
  },

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    return {
      score: Math.round(state.onTicks / 10),
      accuracy: percent(state.onTicks, state.ticks),
      avgTimeMs: 0,
      metrics: {
        onTargetMs: state.onTicks * TRACK_DOT.tickMs,
        longestHoldMs: state.longestHoldTicks * TRACK_DOT.tickMs,
      },
    };
  },
};

/** Share of time on the target × the level's ceiling */
export function trackDotRating(outcome: SessionOutcome, level: number): number {
  return (outcome.accuracy / 100) * levelCeiling(level);
}
