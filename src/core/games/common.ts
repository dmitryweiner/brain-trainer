import type { Cue } from '../types';

// Helpers shared by the game engines: one rating scale and one level range
// for every game, so ratings stay comparable (PLAN-IMPROVEMENTS.md, 4.1).

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

export function clampLevel(level: number, min = MIN_LEVEL, max = MAX_LEVEL): number {
  return Math.min(max, Math.max(min, Math.round(level)));
}

/** Rating ceiling of a level: a perfect, quick session at level 10 is worth 1000. */
export function levelCeiling(level: number): number {
  return 400 + 60 * level;
}

/**
 * 1 at `fastMs` or quicker, falling linearly to `floor` at `slowMs` and
 * beyond. Speed only discounts a rating; accuracy and level carry it.
 */
export function speedFactor(avgMs: number, fastMs: number, slowMs: number, floor: number): number {
  if (avgMs <= fastMs) return 1;
  if (avgMs >= slowMs) return floor;
  return 1 - ((1 - floor) * (avgMs - fastMs)) / (slowMs - fastMs);
}

export function average(values: readonly number[]): number {
  return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Common round bookkeeping for "answer, see feedback, next" games */
export interface TimedAnswer {
  correct: boolean;
  timeMs: number;
}

export function elapsed(now: number, since: number): number {
  return Math.max(0, Math.round(now - since));
}

/**
 * Cues from counters: "good" when a success counter grew, "bad" when a
 * failure counter grew. Most engines describe their feedback this way.
 */
export function counterCues<S>(good: (s: S) => number, bad: (s: S) => number, tick?: (s: S) => number) {
  return (prev: S, next: S): Cue[] => {
    const cues: Cue[] = [];
    if (good(next) > good(prev)) cues.push('good');
    if (bad(next) > bad(prev)) cues.push('bad');
    if (tick && tick(next) > tick(prev)) cues.push('tick');
    return cues;
  };
}
