// Schulte table: find the numbers in order as fast as possible. Levels 1–7
// grow the table (4×4, 5×5, 6×6); from level 8 it is red-black: black
// numbers go up, red go down, alternating (black 1, red N, black 2, …).
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import { clampLevel, counterCues, elapsed, levelCeiling, percent } from '../common';

export const SCHULTE = {
  /** A table that takes longer than this ends the session */
  maxMs: 180_000,
  flashMs: 300,
} as const;

export type SchulteColor = 'black' | 'red';

export interface SchulteCell {
  value: number;
  color: SchulteColor;
}

export interface SchulteLayout {
  size: number;
  redBlack: boolean;
}

export function schulteLayout(level: number): SchulteLayout {
  const L = clampLevel(level);
  if (L >= 8) return { size: 5, redBlack: true };
  return { size: L <= 2 ? 4 : L <= 5 ? 5 : 6, redBlack: false };
}

/** The order cells must be found in */
export function schulteSequence(layout: SchulteLayout): SchulteCell[] {
  const total = layout.size * layout.size;
  if (!layout.redBlack) return Array.from({ length: total }, (_, i) => ({ value: i + 1, color: 'black' as const }));
  const blacks = Math.ceil(total / 2);
  const reds = total - blacks;
  const seq: SchulteCell[] = [];
  for (let i = 0; i < blacks; i++) {
    seq.push({ value: i + 1, color: 'black' });
    if (i < reds) seq.push({ value: reds - i, color: 'red' });
  }
  return seq;
}

export interface SchulteState {
  phase: 'playing' | 'done';
  level: number;
  layout: SchulteLayout;
  cells: SchulteCell[];
  sequence: SchulteCell[];
  /** Index into `sequence` of the next cell to find */
  next: number;
  errors: number;
  startedAt: number;
  finishedAt: number;
  /** Last tapped cell and whether it was right, for a short flash */
  flash: { index: number; correct: boolean } | null;
  flashUntil: number;
}

export type SchulteEvent = { type: 'tap'; index: number } | { type: 'timeout' } | { type: 'unflash' };

export const schulteEngine: GameEngine<SchulteState, SchulteEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const layout = schulteLayout(L);
    const sequence = schulteSequence(layout);
    return {
      phase: 'playing', level: L, layout, cells: ctx.rng.shuffle(sequence), sequence, next: 0, errors: 0,
      startedAt: ctx.now, finishedAt: 0, flash: null, flashUntil: 0,
    };
  },

  reduce(state, event, ctx) {
    if (state.phase !== 'playing') return state;
    if (event.type === 'timeout') return { ...state, phase: 'done', finishedAt: ctx.now };
    if (event.type === 'unflash') return { ...state, flash: null };
    const cell = state.cells[event.index];
    if (!cell) return state;
    const want = state.sequence[state.next];
    const correct = cell.value === want.value && cell.color === want.color;
    const flash = { index: event.index, correct };
    if (!correct) return { ...state, errors: state.errors + 1, flash, flashUntil: ctx.now + SCHULTE.flashMs };
    const next = state.next + 1;
    return next >= state.sequence.length
      ? { ...state, next, flash, phase: 'done', finishedAt: ctx.now }
      : { ...state, next, flash, flashUntil: ctx.now + SCHULTE.flashMs };
  },

  timers(state): TimerRequest<SchulteEvent>[] {
    if (state.phase !== 'playing') return [];
    const timers: TimerRequest<SchulteEvent>[] = [{ id: 'timeout', at: state.startedAt + SCHULTE.maxMs, event: { type: 'timeout' } }];
    if (state.flash) timers.push({ id: `flash-${state.flashUntil}`, at: state.flashUntil, event: { type: 'unflash' } });
    return timers;
  },

  cues: counterCues<SchulteState>(s => s.next, s => s.errors),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const timeMs = elapsed(state.finishedAt, state.startedAt);
    const found = state.next;
    return {
      score: found,
      accuracy: percent(found, found + state.errors),
      avgTimeMs: found > 0 ? Math.round(timeMs / found) : 0,
      metrics: {
        tableMs: timeMs,
        size: state.layout.size,
        redBlack: state.layout.redBlack ? 1 : 0,
        errors: state.errors,
        completed: found === state.sequence.length ? 1 : 0,
      },
    };
  },
};

/**
 * Seconds per cell decide it: 0.8 s or quicker is the level's full ceiling,
 * 3 s or slower is 30% of it; errors and an unfinished table discount it.
 */
export function schulteRating(outcome: SessionOutcome, level: number): number {
  const perCell = outcome.avgTimeMs / 1000;
  const speed = perCell <= 0.8 ? 1 : perCell >= 3 ? 0.3 : 1 - (0.7 * (perCell - 0.8)) / 2.2;
  const done = outcome.metrics.completed === 1 ? 1 : 0.5;
  return speed * (outcome.accuracy / 100) * done * levelCeiling(level);
}
