// Memory Flip: find the pairs. A session is three boards; the level moves
// that window along 2×3, 3×4, 4×4, 4×5, 5×6.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { clampLevel, counterCues, elapsed, levelCeiling } from '../common';

export const MEMORY_FLIP = {
  boardsPerSession: 3,
  mismatchMs: 800,
  boardDoneMs: 900,
  /** moves a good memory needs per pair (first sightings are unavoidable) */
  movesPerPair: 1.6,
  emojis: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
    '🐔', '🐧', '🐦', '🌺', '🌸', '🌼', '🌻', '🌹', '🌷', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇',
  ],
} as const;

export const BOARDS: readonly { rows: number; cols: number }[] = [
  { rows: 2, cols: 3 }, { rows: 3, cols: 4 }, { rows: 4, cols: 4 }, { rows: 4, cols: 5 }, { rows: 5, cols: 6 },
];

export function boardsFor(level: number): { rows: number; cols: number }[] {
  const L = clampLevel(level);
  const first = L <= 3 ? 0 : L <= 6 ? 1 : 2;
  return BOARDS.slice(first, first + MEMORY_FLIP.boardsPerSession);
}

export interface FlipCard {
  emoji: string;
  matched: boolean;
}

export interface MemoryFlipState {
  phase: 'playing' | 'mismatch' | 'boardDone' | 'done';
  level: number;
  boards: { rows: number; cols: number }[];
  board: number;
  cards: FlipCard[];
  /** face-up, not yet matched (0–2) */
  open: number[];
  moves: number;
  totalMoves: number;
  totalPairs: number;
  boardStartedAt: number;
  boardTimes: number[];
  score: number;
  until: number;
}

export type MemoryFlipEvent = { type: 'flip'; index: number } | { type: 'tick' };

function deal(rows: number, cols: number, rng: Rng): FlipCard[] {
  const pairs = rng.sample(MEMORY_FLIP.emojis, (rows * cols) / 2);
  return rng.shuffle([...pairs, ...pairs]).map(emoji => ({ emoji, matched: false }));
}

function startBoard(state: MemoryFlipState, index: number, rng: Rng, now: number): MemoryFlipState {
  const { rows, cols } = state.boards[index];
  return { ...state, phase: 'playing', board: index, cards: deal(rows, cols, rng), open: [], moves: 0, boardStartedAt: now };
}

/** Pairs found this session (a finished board is already in totalPairs) */
export function pairsFound(s: MemoryFlipState): number {
  const finished = s.phase === 'boardDone' || s.phase === 'done';
  return s.totalPairs + (finished ? 0 : s.cards.filter(c => c.matched).length / 2);
}

export const memoryFlipEngine: GameEngine<MemoryFlipState, MemoryFlipEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const base: MemoryFlipState = {
      phase: 'playing', level: L, boards: boardsFor(L), board: 0, cards: [], open: [], moves: 0, totalMoves: 0,
      totalPairs: 0, boardStartedAt: ctx.now, boardTimes: [], score: 0, until: 0,
    };
    return startBoard(base, 0, ctx.rng, ctx.now);
  },

  reduce(state, event, ctx) {
    const { now, rng } = ctx;
    if (event.type === 'tick') {
      if (state.phase === 'mismatch') return { ...state, phase: 'playing', open: [] };
      if (state.phase === 'boardDone') {
        const next = state.board + 1;
        return next >= state.boards.length ? { ...state, phase: 'done' } : startBoard(state, next, rng, now);
      }
      return state;
    }
    if (state.phase !== 'playing') return state;
    const card = state.cards[event.index];
    if (!card || card.matched || state.open.includes(event.index)) return state;
    const open = [...state.open, event.index];
    if (open.length < 2) return { ...state, open };

    const moves = state.moves + 1;
    const [a, b] = open;
    if (state.cards[a].emoji !== state.cards[b].emoji) {
      return { ...state, open, moves, totalMoves: state.totalMoves + 1, phase: 'mismatch', until: now + MEMORY_FLIP.mismatchMs };
    }
    const cards = state.cards.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
    const next = { ...state, cards, open: [], moves, totalMoves: state.totalMoves + 1 };
    if (!cards.every(c => c.matched)) return next;
    const pairs = cards.length / 2;
    // like v1: 2 points a pair, minus one per move beyond a good memory's count
    const points = Math.max(0, 2 * pairs - Math.max(0, moves - Math.round(pairs * MEMORY_FLIP.movesPerPair)));
    return {
      ...next,
      phase: 'boardDone',
      totalPairs: state.totalPairs + pairs,
      boardTimes: [...state.boardTimes, elapsed(now, state.boardStartedAt)],
      score: state.score + points,
      until: now + MEMORY_FLIP.boardDoneMs,
    };
  },

  timers(state): TimerRequest<MemoryFlipEvent>[] {
    return state.phase === 'mismatch' || state.phase === 'boardDone'
      ? [{ id: `${state.phase}-${state.board}-${state.totalMoves}`, at: state.until, event: { type: 'tick' } }]
      : [];
  },

  // a match is good; a move that found no pair is bad
  cues: counterCues<MemoryFlipState>(pairsFound, s => s.totalMoves - pairsFound(s)),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const efficiency = state.totalMoves > 0 ? (state.totalPairs * MEMORY_FLIP.movesPerPair) / state.totalMoves : 0;
    return {
      score: state.score,
      accuracy: Math.min(100, Math.round(efficiency * 100)),
      avgTimeMs: 0,
      metrics: {
        moves: state.totalMoves,
        pairs: state.totalPairs,
        boards: state.boardTimes.length,
        ...(state.boardTimes.length > 0 ? { boardTimeMs: Math.round(state.boardTimes.reduce((x, y) => x + y, 0) / state.boardTimes.length) } : {}),
      },
    };
  },
};

/** Level that v1 sessions (2×3 … 4×5 in one go) correspond to */
export const V1_EQUIVALENT_LEVEL = 4;
const V1_MAX_SCORE = 100;

export function memoryFlipSessionLevel(session: { level: number; metrics: Record<string, number> }): number {
  return session.metrics.moves === undefined ? V1_EQUIVALENT_LEVEL : session.level;
}

/** Move efficiency × the level's ceiling */
export function memoryFlipRating(outcome: SessionOutcome, level: number): number {
  if (outcome.metrics.moves === undefined) return (outcome.score / V1_MAX_SCORE) * levelCeiling(level);
  return (outcome.accuracy / 100) * levelCeiling(level);
}

