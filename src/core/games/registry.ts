// The one place a game is registered (PLAN-IMPROVEMENTS.md, 5.2). Menu,
// routing, profile and stats read this list; the UI layer adds the views.
import type { GameCategory, GameDefinition, GameId, SessionOutcome } from '../types';
import { reactionClickEngine } from './reactionClick/engine';
import { oddOneOutEngine } from './oddOneOut/engine';

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
}

// Until stage 2 gives each game its own rating, every game is rated like v1
// history, so old and new sessions sit on one scale.
function define(base: Base): GameDefinition {
  return {
    minLevel: 1,
    maxLevel: 1,
    sessionKind: 'rounds',
    rating: (outcome: SessionOutcome) => legacyRating(outcome.score, base.legacyMaxScore),
    ...base,
  };
}

/** Games in the menu, in menu order. */
export const GAMES: readonly GameDefinition[] = [
  define({ id: 'reaction-click', category: 'reaction', icon: '⚡', difficulty: 1, legacyMaxScore: 25, engine: reactionClickEngine }),
  define({ id: 'odd-one-out', category: 'attention', icon: '🔍', difficulty: 2, legacyMaxScore: 40, engine: oddOneOutEngine }),
  define({ id: 'memory-flip', category: 'memory', icon: '🃏', difficulty: 2, legacyMaxScore: 100 }),
  define({ id: 'sequence-recall', category: 'memory', icon: '🧠', difficulty: 3, legacyMaxScore: 18 }),
  define({ id: 'dual-rule-reaction', category: 'attention', icon: '🔄', difficulty: 3, legacyMaxScore: 30 }),
  define({ id: 'n-back', category: 'memory', icon: '⏮️', difficulty: 4, legacyMaxScore: 45 }),
  define({ id: 'phone-recall', category: 'memory', icon: '📞', difficulty: 3, legacyMaxScore: 22 }),
  define({ id: 'emoji-hunt', category: 'attention', icon: '🔎', difficulty: 2, legacyMaxScore: 125 }),
  define({ id: 'flags-game', category: 'knowledge', icon: '🏳️', difficulty: 2, legacyMaxScore: 100 }),
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

export function findActiveGame(id: string): GameDefinition | undefined {
  return GAMES.find(g => g.id === id);
}
