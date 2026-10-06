// "Where was it": objects sit in a grid for a few seconds, then hide; for
// each one, tap the cell it was in. Three boards per session. The level
// sets the grid (2×2…4×4), how many objects and how long they show.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';

export const WHERE_WAS = {
  boards: 3,
  feedbackMs: 900,
  objects: ['🍎', '🐱', '🚗', '⚽', '🌻', '🔑', '🎈', '🐟', '⏰', '🍌', '🎁', '🐢', '☂️', '🧸', '🍄', '🚲'],
} as const;

export function whereLayout(level: number): { size: number; items: number; showMs: number } {
  const L = clampLevel(level);
  const size = L <= 2 ? 2 : L <= 6 ? 3 : 4;
  const items = Math.min(size * size - 1, L <= 2 ? 2 + L : L <= 6 ? 2 + Math.ceil(L / 2) : 3 + Math.ceil(L / 2));
  return { size, items, showMs: Math.max(1800, 2600 + 350 * items - 180 * L) };
}

export interface Placed {
  object: string;
  cell: number;
}

export interface WhereWasState {
  phase: 'showing' | 'asking' | 'feedback' | 'done';
  level: number;
  size: number;
  board: number;
  placed: Placed[];
  /** indexes into `placed`, in asking order */
  queue: number[];
  asked: number;
  askedAt: number;
  picked: number | null;
  answers: { correct: boolean; timeMs: number }[];
  score: number;
  until: number;
}

export type WhereWasEvent = { type: 'pick'; cell: number } | { type: 'tick' };

/** The object being asked about right now */
export function currentQuestion(s: WhereWasState): Placed | null {
  return s.phase === 'asking' || s.phase === 'feedback' ? s.placed[s.queue[s.asked]] ?? null : null;
}

function deal(state: WhereWasState, rng: Rng, now: number): WhereWasState {
  const { size, items, showMs } = whereLayout(state.level);
  const objects = rng.sample(WHERE_WAS.objects, items);
  const cells = rng.sample(Array.from({ length: size * size }, (_, i) => i), items);
  const placed = objects.map((object, i) => ({ object, cell: cells[i] }));
  return {
    ...state, phase: 'showing', size, placed, queue: rng.shuffle(placed.map((_, i) => i)), asked: 0, picked: null,
    until: now + showMs,
  };
}

export const whereWasEngine: GameEngine<WhereWasState, WhereWasEvent> = {
  init(level, ctx: EngineContext) {
    const base: WhereWasState = {
      phase: 'showing', level: clampLevel(level), size: 2, board: 0, placed: [], queue: [], asked: 0, askedAt: 0,
      picked: null, answers: [], score: 0, until: 0,
    };
    return deal(base, ctx.rng, ctx.now);
  },

  reduce(state, event, ctx) {
    const { now, rng } = ctx;
    if (event.type === 'tick') {
      if (state.phase === 'showing') return { ...state, phase: 'asking', askedAt: now };
      if (state.phase !== 'feedback') return state;
      const asked = state.asked + 1;
      if (asked < state.queue.length) return { ...state, phase: 'asking', asked, picked: null, askedAt: now };
      const board = state.board + 1;
      return board >= WHERE_WAS.boards ? { ...state, phase: 'done', board } : deal({ ...state, board }, rng, now);
    }
    if (state.phase !== 'asking' || event.cell < 0 || event.cell >= state.size * state.size) return state;
    const correct = event.cell === currentQuestion(state)!.cell;
    return {
      ...state,
      phase: 'feedback',
      picked: event.cell,
      answers: [...state.answers, { correct, timeMs: elapsed(now, state.askedAt) }],
      score: state.score + (correct ? state.size : 0),
      until: now + WHERE_WAS.feedbackMs,
    };
  },

  timers(state): TimerRequest<WhereWasEvent>[] {
    return state.phase === 'showing' || state.phase === 'feedback'
      ? [{ id: `${state.phase}-${state.board}-${state.asked}`, at: state.until, event: { type: 'tick' } }]
      : [];
  },

  cues: counterCues<WhereWasState>(s => s.answers.filter(a => a.correct).length, s => s.answers.filter(a => !a.correct).length),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const correct = state.answers.filter(a => a.correct).length;
    return {
      score: state.score,
      accuracy: percent(correct, state.answers.length),
      avgTimeMs: average(state.answers.map(a => a.timeMs)),
      metrics: { correct, questions: state.answers.length, objects: whereLayout(state.level).items },
    };
  },
};

/** Accuracy × speed (≤2 s full, ≥6 s 70%) × the level's ceiling */
export function whereWasRating(outcome: SessionOutcome, level: number): number {
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 2000, 6000, 0.7) * levelCeiling(level);
}
