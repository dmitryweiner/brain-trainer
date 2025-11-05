// Общие типы для игр

export type GameId = 
  | 'reaction-click'
  | 'color-tap'
  | 'symbol-match'
  | 'odd-one-out'
  | 'hidden-number'
  | 'memory-flip'
  | 'sequence-recall'
  | 'dual-rule-reaction'
  | 'n-back'
  | 'logic-pair-concept';

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

// Reaction Click
export interface ReactionState {
  status: 'waiting' | 'ready' | 'clicked' | 'results';
  currentAttempt: number;
  startTime: number | null;
  reactionTimes: number[];
}

// Color Tap
export interface ColorTapState {
  currentRound: number;
  currentColor: 'green' | 'red';
  correctAnswers: number;
  startTime: number;
  results: { correct: boolean; time: number }[];
}

// Symbol Match
export interface SymbolMatchState {
  currentRound: number;
  emoji1: string;
  emoji2: string;
  correctAnswers: number;
  startTime: number;
}

// Odd One Out
export interface OddOneOutState {
  currentRound: number;
  emojis: string[];
  oddOneIndex: number;
  correctAnswers: number;
  startTime: number;
}

// Hidden Number
export interface HiddenNumberState {
  currentRound: number;
  targetPosition: number;
  startTime: number;
  times: number[];
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

// Logic Pair Concept
export interface LogicPairRoundData {
  items: string[];
  correctPairs: number[][];
  category: string;
}

export interface LogicPairConceptState {
  currentRound: number;
  selectedItems: number[];
  correctAnswers: number;
  currentRoundData: LogicPairRoundData;
}

