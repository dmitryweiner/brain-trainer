// Memory Matrix: K cells light up for a moment, then go dark; tap the same
// cells. The level sets the grid (3×3…6×6), K (3…12) and how long the
// pattern shows.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import { clampLevel, counterCues, levelCeiling, percent } from '../common';

export const MEMORY_MATRIX = {
  rounds: 8,
  feedbackMs: 900,
  /** Pause between the board appearing and the pattern lighting up */
  readyMs: 600,
} as const;

export interface MatrixLayout {
  gridSize: number;
  cells: number;
  showMs: number;
}

export function matrixLayout(level: number): MatrixLayout {
  const L = clampLevel(level);
  const gridSize = Math.min(6, 3 + Math.floor((L - 1) / 3));
  return {
    gridSize,
    cells: Math.min(12, Math.floor((gridSize * gridSize) / 2), 2 + L),
    showMs: Math.max(800, 1600 - 80 * (L - 1)),
  };
}

export interface MemoryMatrixState {
  phase: 'ready' | 'showing' | 'input' | 'feedback' | 'done';
  level: number;
  layout: MatrixLayout;
  round: number;
  pattern: number[];
  /** Taps this round, in order */
  taps: number[];
  /** Correct taps / all taps, over the session */
  correctTaps: number;
  wrongTaps: number;
  perfectRounds: number;
  score: number;
  lastPerfect: boolean;
  until: number;
}

export type MemoryMatrixEvent = { type: 'tap'; cell: number } | { type: 'next' };

function newRound(state: MemoryMatrixState, ctx: EngineContext): MemoryMatrixState {
  const all = Array.from({ length: state.layout.gridSize ** 2 }, (_, i) => i);
  return {
    ...state,
    phase: 'ready',
    pattern: ctx.rng.sample(all, state.layout.cells).sort((a, b) => a - b),
    taps: [],
    until: ctx.now + MEMORY_MATRIX.readyMs,
  };
}

function finishRound(state: MemoryMatrixState, ctx: EngineContext): MemoryMatrixState {
  const perfect = state.taps.every(c => state.pattern.includes(c)) && state.taps.length === state.pattern.length;
  return {
    ...state,
    phase: 'feedback',
    round: state.round + 1,
    perfectRounds: state.perfectRounds + (perfect ? 1 : 0),
    score: state.score + (perfect ? state.pattern.length : 0),
    lastPerfect: perfect,
    until: ctx.now + MEMORY_MATRIX.feedbackMs,
  };
}

export const memoryMatrixEngine: GameEngine<MemoryMatrixState, MemoryMatrixEvent> = {
  init(level, ctx) {
    const L = clampLevel(level);
    return newRound(
      {
        phase: 'ready', level: L, layout: matrixLayout(L), round: 0, pattern: [], taps: [],
        correctTaps: 0, wrongTaps: 0, perfectRounds: 0, score: 0, lastPerfect: false, until: 0,
      },
      ctx,
    );
  },

  reduce(state, event, ctx) {
    if (event.type === 'next') {
      if (state.phase === 'ready') return { ...state, phase: 'showing', until: ctx.now + state.layout.showMs };
      if (state.phase === 'showing') return { ...state, phase: 'input' };
      if (state.phase === 'feedback') {
        return state.round >= MEMORY_MATRIX.rounds ? { ...state, phase: 'done' } : newRound(state, ctx);
      }
      return state;
    }
    if (state.phase !== 'input' || state.taps.includes(event.cell)) return state;
    if (event.cell < 0 || event.cell >= state.layout.gridSize ** 2) return state;
    const hit = state.pattern.includes(event.cell);
    const next = {
      ...state,
      taps: [...state.taps, event.cell],
      correctTaps: state.correctTaps + (hit ? 1 : 0),
      wrongTaps: state.wrongTaps + (hit ? 0 : 1),
    };
    // A round ends when every lit cell is found or after as many taps as there were cells
    const found = next.taps.filter(c => state.pattern.includes(c)).length;
    return found === state.pattern.length || next.taps.length >= state.pattern.length ? finishRound(next, ctx) : next;
  },

  timers(state): TimerRequest<MemoryMatrixEvent>[] {
    return state.phase === 'ready' || state.phase === 'showing' || state.phase === 'feedback'
      ? [{ id: `${state.phase}-${state.round}`, at: state.until, event: { type: 'next' } }]
      : [];
  },

  cues: counterCues<MemoryMatrixState>(s => s.correctTaps, s => s.wrongTaps),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    return {
      score: state.score,
      accuracy: percent(state.correctTaps, state.correctTaps + state.wrongTaps),
      avgTimeMs: 0,
      metrics: {
        cells: state.layout.cells,
        gridSize: state.layout.gridSize,
        perfectRounds: state.perfectRounds,
        rounds: state.round,
      },
    };
  },
};

/** Share of correct taps × the level's ceiling */
export function memoryMatrixRating(outcome: SessionOutcome, level: number): number {
  return (outcome.accuracy / 100) * levelCeiling(level);
}
