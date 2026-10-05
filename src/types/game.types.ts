// Общие типы для игр

export type { GameId } from '../core/types';
import type { GameId } from '../core/types';

export interface GameMeta {
  id: GameId;
  title: string;
  description: string;
  icon: string;
  difficulty: number;
}

export interface GameResult {
  gameId: GameId;
  score: number;
  date: string;
  details: unknown;
}

// Memory Flip
export interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface MemoryFlipState {
  level: 1 | 2 | 3 | 4;
  cards: Card[];
  flippedCards: number[];
  matchedPairs: number;
  moves: number;
  startTime: number;
}

// Sequence Recall
export interface SequenceRecallState {
  sequence: string[];
  userSequence: string[];
  currentLength: number;
  phase: 'showing' | 'input' | 'result';
  showingIndex: number;
}

// Dual-Rule Reaction
export interface DualRuleState {
  currentRound: number;
  shape: 'circle' | 'square';
  color: 'green' | 'red';
  currentRule: 'shape' | 'color';
  errors: number;
  startTime: number;
}

// N-Back
export interface NBackState {
  sequence: string[];
  currentIndex: number;
  currentBlock: number;
  hits: number;
  misses: number;
  falseAlarms: number;
}

// Phone Recall
export interface PhoneRecallState {
  number: string;
  userInput: string;
  currentLength: number;
}

// Emoji Hunt
export interface EmojiHuntState {
  currentRound: number;
  grid: string[];
  targetEmoji: string;
  targetIndex: number;
  gridSize: number;
  correctAnswers: number;
  startTime: number;
}

