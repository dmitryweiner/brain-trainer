// Emoji Hunt: find the one target emoji in a grid of others. The grid grows
// during the session and with the level; late rounds use look-alike sets.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { average, clampLevel, elapsed, levelCeiling, percent, speedFactor } from '../common';

export const EMOJI_HUNT = {
  rounds: 10,
  feedbackMs: 800,
  maxGrid: 8,
} as const;

type Pool = { distractors: readonly string[]; targets: readonly string[] };

export const EMOJI_POOLS: Record<'easy' | 'medium' | 'hard', readonly Pool[]> = {
  // different categories, easy to tell apart
  easy: [{
    distractors: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🥝', '🍑', '🥭', '🍒'],
    targets: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'],
  }],
  // one category (faces), a visible difference
  medium: [{
    distractors: ['😀', '😃', '😄', '😁', '😊', '🙂', '😇', '😉', '😌', '😍', '🥰', '😘'],
    targets: ['😢', '😭', '😤', '😠', '😡', '🤬', '😰', '😨', '😱', '🥺'],
  }],
  // look-alikes
  hard: [
    { distractors: ['🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌝', '🌚'], targets: ['🌛', '🌜'] },
    { distractors: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💗', '💖', '💝'], targets: ['💔', '❣️'] },
  ],
};

export type HuntDifficulty = keyof typeof EMOJI_POOLS;

/** Grid side and pool for a round: 4…7 by level, +1 at round 4 and +2 at round 7, at most 8 */
export function huntRound(level: number, round: number): { size: number; difficulty: HuntDifficulty } {
  const L = clampLevel(level);
  const base = 4 + Math.floor((L - 1) / 3);
  const step = round >= 7 ? 2 : round >= 4 ? 1 : 0;
  const tier = Math.min(2, Math.floor((L - 1) / 4) + (round >= 7 ? 1 : 0) + (round >= 4 ? 1 : 0) - 1);
  return { size: Math.min(EMOJI_HUNT.maxGrid, base + step), difficulty: (['easy', 'medium', 'hard'] as const)[Math.max(0, tier)] };
}

export interface EmojiHuntState {
  phase: 'playing' | 'feedback' | 'done';
  level: number;
  round: number;
  size: number;
  difficulty: HuntDifficulty;
  grid: string[];
  target: string;
  targetIndex: number;
  roundStartedAt: number;
  answers: { correct: boolean; timeMs: number }[];
  lastCorrect: boolean;
  score: number;
  until: number;
}

export type EmojiHuntEvent = { type: 'pick'; index: number } | { type: 'next' };

function deal(state: EmojiHuntState, rng: Rng, now: number): EmojiHuntState {
  const { size, difficulty } = huntRound(state.level, state.round);
  const pool = rng.pick(EMOJI_POOLS[difficulty]);
  const target = rng.pick(pool.targets);
  const grid = Array.from({ length: size * size }, () => rng.pick(pool.distractors));
  const targetIndex = rng.int(0, grid.length - 1);
  grid[targetIndex] = target;
  return { ...state, phase: 'playing', size, difficulty, grid, target, targetIndex, roundStartedAt: now };
}

export const emojiHuntEngine: GameEngine<EmojiHuntState, EmojiHuntEvent> = {
  init(level, ctx: EngineContext) {
    const base: EmojiHuntState = {
      phase: 'playing', level: clampLevel(level), round: 0, size: 4, difficulty: 'easy', grid: [], target: '',
      targetIndex: 0, roundStartedAt: ctx.now, answers: [], lastCorrect: false, score: 0, until: 0,
    };
    return deal(base, ctx.rng, ctx.now);
  },

  reduce(state, event, ctx) {
    if (event.type === 'next') {
      if (state.phase !== 'feedback') return state;
      return state.round >= EMOJI_HUNT.rounds ? { ...state, phase: 'done' } : deal(state, ctx.rng, ctx.now);
    }
    if (state.phase !== 'playing' || event.index < 0 || event.index >= state.grid.length) return state;
    const correct = event.index === state.targetIndex;
    const timeMs = elapsed(ctx.now, state.roundStartedAt);
    // like v1: grid side + a bonus for answers under 3 s
    const points = correct ? state.size + Math.max(0, Math.floor((3000 - timeMs) / 500)) : 0;
    return {
      ...state,
      phase: 'feedback',
      round: state.round + 1,
      answers: [...state.answers, { correct, timeMs }],
      lastCorrect: correct,
      score: state.score + points,
      until: ctx.now + EMOJI_HUNT.feedbackMs,
    };
  },

  timers(state): TimerRequest<EmojiHuntEvent>[] {
    return state.phase === 'feedback' ? [{ id: `next-${state.round}`, at: state.until, event: { type: 'next' } }] : [];
  },

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const correct = state.answers.filter(a => a.correct);
    return {
      score: state.score,
      accuracy: percent(correct.length, state.answers.length),
      avgTimeMs: average(correct.map(a => a.timeMs)),
      metrics: { correct: correct.length, rounds: state.answers.length, maxGridSize: state.size },
    };
  },
};

/** Level that v1 sessions (5×5, 6×6, 8×8) correspond to */
export const V1_EQUIVALENT_LEVEL = 4;
const V1_MAX_SCORE = 125;

export function emojiHuntSessionLevel(session: { level: number; metrics: Record<string, number> }): number {
  return session.metrics.correct === undefined ? V1_EQUIVALENT_LEVEL : session.level;
}

/** Accuracy × speed (≤2 s full, ≥8 s 60%) × the level's ceiling */
export function emojiHuntRating(outcome: SessionOutcome, level: number): number {
  if (outcome.metrics.correct === undefined) return (outcome.score / V1_MAX_SCORE) * levelCeiling(level);
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 2000, 8000, 0.6) * levelCeiling(level);
}
