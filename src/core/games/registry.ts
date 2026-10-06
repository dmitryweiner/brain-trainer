// The one place a game is registered (PLAN-IMPROVEMENTS.md, 5.2). Menu,
// routing, profile and stats read this list; the UI layer adds the views.
import type { GameCategory, GameDefinition, GameId, GameSession, SessionOutcome } from '../types';
import { reactionClickEngine, reactionClickRating } from './reactionClick/engine';
import { oddOneOutEngine, oddOneOutRating, oddOneOutSessionLevel } from './oddOneOut/engine';
import { memoryMatrixEngine, memoryMatrixRating } from './memoryMatrix/engine';
import { schulteEngine, schulteRating } from './schulte/engine';
import { whackEngine, whackRating } from './whackAMole/engine';
import { traceEngine, traceRating } from './traceLine/engine';
import { rotateShapeEngine, rotateShapeRating } from './rotateShape/engine';
import { sequenceEngine, sequenceRating } from './sequenceRecall/engine';
import { digitSpanEngine, digitSpanRating } from './digitSpan/engine';
import { taskSwitchEngine, taskSwitchRating, taskSwitchSessionLevel } from './taskSwitch/engine';
import { memoryFlipEngine, memoryFlipRating, memoryFlipSessionLevel } from './memoryFlip/engine';
import { emojiHuntEngine, emojiHuntRating, emojiHuntSessionLevel } from './emojiHunt/engine';
import { flagsEngine, flagsRating } from './flags/engine';
import { nBackEngine, nBackRating, nBackSessionLevel } from './nBack/engine';
import { whereWasEngine, whereWasRating } from './whereWas/engine';
import { mirrorEngine, mirrorRating } from './mirror/engine';
import { mazeEngine, mazeRating } from './maze/engine';
import { trackDotEngine, trackDotRating } from './trackDot/engine';
import { fitPieceEngine, fitPieceRating } from './fitPiece/engine';
import { MAX_LEVEL, MIN_LEVEL } from './common';

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(1000, Math.max(0, value)));
}

/** v1 normalization: raw score against the game's known maximum. */
export function legacyRating(score: number, legacyMaxScore: number): number {
  return legacyMaxScore > 0 ? clampRating((score / legacyMaxScore) * 1000) : 0;
}

interface Base {
  id: GameId;
  category: GameCategory;
  icon: string;
  difficulty: number;
  legacyMaxScore: number;
  engine?: GameDefinition['engine'];
  rating?: GameDefinition['rating'];
  sessionLevel?: GameDefinition['sessionLevel'];
  minLevel?: number;
  maxLevel?: number;
  sessionKind?: GameDefinition['sessionKind'];
}

// Defaults: a single level and the v1 rating (raw score against the known
// maximum) — what the retired games keep for their history.
function define(base: Base): GameDefinition {
  return {
    minLevel: 1,
    maxLevel: 1,
    sessionKind: 'rounds',
    rating: (outcome: SessionOutcome) => legacyRating(outcome.score, base.legacyMaxScore),
    ...base,
  };
}

const LEVELS = { minLevel: MIN_LEVEL, maxLevel: MAX_LEVEL };

/** Games in the menu, grouped by category in menu order (memory, attention, reaction, spatial, knowledge). */
export const GAMES: readonly GameDefinition[] = [
  define({ id: 'memory-matrix', category: 'memory', icon: '🟩', difficulty: 2, legacyMaxScore: 0, engine: memoryMatrixEngine, rating: memoryMatrixRating, ...LEVELS }),
  define({ id: 'where-was', category: 'memory', icon: '📍', difficulty: 2, legacyMaxScore: 0, engine: whereWasEngine, rating: whereWasRating, ...LEVELS }),
  define({ id: 'sequence-recall', category: 'memory', icon: '🎹', difficulty: 2, legacyMaxScore: 18, engine: sequenceEngine, rating: sequenceRating, ...LEVELS }),
  define({ id: 'phone-recall', category: 'memory', icon: '📞', difficulty: 3, legacyMaxScore: 22, engine: digitSpanEngine, rating: digitSpanRating, ...LEVELS }),
  define({
    id: 'n-back', category: 'memory', icon: '⏮️', difficulty: 4, legacyMaxScore: 45,
    engine: nBackEngine, rating: nBackRating, sessionLevel: nBackSessionLevel, ...LEVELS,
  }),
  define({
    id: 'memory-flip', category: 'memory', icon: '🃏', difficulty: 2, legacyMaxScore: 100,
    engine: memoryFlipEngine, rating: memoryFlipRating, sessionLevel: memoryFlipSessionLevel, ...LEVELS,
  }),
  define({ id: 'schulte', category: 'attention', icon: '🔢', difficulty: 2, legacyMaxScore: 0, engine: schulteEngine, rating: schulteRating, ...LEVELS }),
  define({
    id: 'odd-one-out', category: 'attention', icon: '🔍', difficulty: 2, legacyMaxScore: 40,
    engine: oddOneOutEngine, rating: oddOneOutRating, sessionLevel: oddOneOutSessionLevel, ...LEVELS,
  }),
  define({
    id: 'emoji-hunt', category: 'attention', icon: '🔎', difficulty: 2, legacyMaxScore: 125,
    engine: emojiHuntEngine, rating: emojiHuntRating, sessionLevel: emojiHuntSessionLevel, ...LEVELS,
  }),
  define({
    id: 'dual-rule-reaction', category: 'attention', icon: '🔀', difficulty: 3, legacyMaxScore: 30,
    engine: taskSwitchEngine, rating: taskSwitchRating, sessionLevel: taskSwitchSessionLevel, ...LEVELS,
  }),
  define({ id: 'whack-a-mole', category: 'reaction', icon: '🐹', difficulty: 1, legacyMaxScore: 0, engine: whackEngine, rating: whackRating, sessionKind: 'timed', ...LEVELS }),
  define({ id: 'reaction-click', category: 'reaction', icon: '⚡', difficulty: 1, legacyMaxScore: 25, engine: reactionClickEngine, rating: reactionClickRating, ...LEVELS }),
  define({ id: 'track-dot', category: 'reaction', icon: '🎯', difficulty: 2, legacyMaxScore: 0, engine: trackDotEngine, rating: trackDotRating, sessionKind: 'timed', ...LEVELS }),
  define({ id: 'trace-line', category: 'reaction', icon: '✍️', difficulty: 2, legacyMaxScore: 0, engine: traceEngine, rating: traceRating, ...LEVELS }),
  define({ id: 'rotate-shape', category: 'spatial', icon: '🔷', difficulty: 3, legacyMaxScore: 0, engine: rotateShapeEngine, rating: rotateShapeRating, ...LEVELS }),
  define({ id: 'mirror', category: 'spatial', icon: '🦋', difficulty: 3, legacyMaxScore: 0, engine: mirrorEngine, rating: mirrorRating, ...LEVELS }),
  define({ id: 'fit-piece', category: 'spatial', icon: '🧩', difficulty: 3, legacyMaxScore: 0, engine: fitPieceEngine, rating: fitPieceRating, ...LEVELS }),
  define({ id: 'maze', category: 'spatial', icon: '🏁', difficulty: 2, legacyMaxScore: 0, engine: mazeEngine, rating: mazeRating, ...LEVELS }),
  define({ id: 'flags-game', category: 'knowledge', icon: '🏳️', difficulty: 2, legacyMaxScore: 100, engine: flagsEngine, rating: flagsRating, ...LEVELS }),
];

/**
 * Removed from the menu (PLAN-IMPROVEMENTS.md, 3.2). Ids stay reserved and
 * their history stays in storage, rated on the same v1 scale.
 */
export const RETIRED_GAMES: readonly GameDefinition[] = [
  define({ id: 'color-tap', category: 'reaction', icon: '🎨', difficulty: 1, legacyMaxScore: 30 }),
  define({ id: 'symbol-match', category: 'attention', icon: '👀', difficulty: 1, legacyMaxScore: 20 }),
  define({ id: 'hidden-number', category: 'attention', icon: '🔢', difficulty: 2, legacyMaxScore: 30 }),
  define({ id: 'logic-pair-concept', category: 'knowledge', icon: '🔗', difficulty: 3, legacyMaxScore: 20 }),
];

const ALL = new Map<GameId, GameDefinition>([...GAMES, ...RETIRED_GAMES].map(g => [g.id, g]));

export function getGame(id: GameId): GameDefinition {
  const game = ALL.get(id);
  if (!game) throw new Error(`unknown game: ${id}`);
  return game;
}

/**
 * A stored session as stats see it: at its effective level and rated with
 * the game's current formula, so formulas can be tuned without migrating
 * history. (The stored rating is what was shown when it was recorded.)
 */
export function normalizeSession(session: GameSession): GameSession {
  const game = ALL.get(session.gameId);
  if (!game) return session;
  const level = game.sessionLevel?.(session) ?? session.level;
  const { score, accuracy, avgTimeMs, metrics } = session;
  return { ...session, level, rating: clampRating(game.rating({ score, accuracy, avgTimeMs, metrics }, level)) };
}

export function findActiveGame(id: string): GameDefinition | undefined {
  return GAMES.find(g => g.id === id);
}
