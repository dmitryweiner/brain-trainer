import type { GameMeta } from '../types/game.types';

// Идентификаторы игр
export const GAME_IDS = {
  REACTION_CLICK: 'reaction-click',
  COLOR_TAP: 'color-tap',
  SYMBOL_MATCH: 'symbol-match',
  ODD_ONE_OUT: 'odd-one-out',
  HIDDEN_NUMBER: 'hidden-number',
  MEMORY_FLIP: 'memory-flip',
  SEQUENCE_RECALL: 'sequence-recall',
  DUAL_RULE: 'dual-rule-reaction',
  N_BACK: 'n-back',
  LOGIC_PAIR: 'logic-pair-concept',
} as const;

// Метаданные игр
export const GAMES_META: GameMeta[] = [
  {
    id: GAME_IDS.REACTION_CLICK,
    title: 'Reaction Click',
    description: 'Тренировка скорости реакции',
    icon: '⚡',
    difficulty: 1,
  },
  {
    id: GAME_IDS.COLOR_TAP,
    title: 'Color Tap',
    description: 'Реакция и селекция',
    icon: '🎨',
    difficulty: 1,
  },
  {
    id: GAME_IDS.SYMBOL_MATCH,
    title: 'Symbol Match',
    description: 'Зрительное внимание',
    icon: '👀',
    difficulty: 1,
  },
  {
    id: GAME_IDS.ODD_ONE_OUT,
    title: 'Odd One Out',
    description: 'Визуальный анализ',
    icon: '🔍',
    difficulty: 2,
  },
  {
    id: GAME_IDS.HIDDEN_NUMBER,
    title: 'Hidden Number',
    description: 'Визуальный поиск',
    icon: '🔢',
    difficulty: 2,
  },
  {
    id: GAME_IDS.MEMORY_FLIP,
    title: 'Memory Flip',
    description: 'Кратковременная память',
    icon: '🃏',
    difficulty: 2,
  },
  {
    id: GAME_IDS.SEQUENCE_RECALL,
    title: 'Sequence Recall',
    description: 'Визуальная память',
    icon: '🧠',
    difficulty: 3,
  },
  {
    id: GAME_IDS.DUAL_RULE,
    title: 'Dual-Rule Reaction',
    description: 'Когнитивная гибкость',
    icon: '🔄',
    difficulty: 3,
  },
  {
    id: GAME_IDS.N_BACK,
    title: 'N-Back',
    description: 'Рабочая память',
    icon: '⏮️',
    difficulty: 4,
  },
  {
    id: GAME_IDS.LOGIC_PAIR,
    title: 'Logic Pair Concept',
    description: 'Абстрактное мышление',
    icon: '🔗',
    difficulty: 3,
  },
];

// Тайминги
export const TIMINGS = {
  REACTION_MIN: 1000,
  REACTION_MAX: 4000,
  SEQUENCE_SHOW: 800,
  SEQUENCE_PAUSE: 200,
  N_BACK_INTERVAL: 2500,
  BLOCK_PAUSE: 3000,
} as const;

// Размеры сеток
export const GRID_SIZES = {
  HIDDEN_NUMBER: { rows: 5, cols: 6 },
  ODD_ONE_OUT: { rows: 2, cols: 2 },
  MEMORY_FLIP_L1: { rows: 2, cols: 3 },
  MEMORY_FLIP_L2: { rows: 3, cols: 4 },
} as const;

// Количество раундов
export const ROUNDS = {
  REACTION_CLICK: 5,
  COLOR_TAP: 20,
  SYMBOL_MATCH: 20,
  ODD_ONE_OUT: 10,
  HIDDEN_NUMBER: 10,
  DUAL_RULE: 30,
  N_BACK_PER_BLOCK: 20,
  N_BACK_BLOCKS: 3,
  LOGIC_PAIR: 10,
} as const;

// LocalStorage ключи
export const STORAGE_KEYS = {
  TOTAL_SCORE: 'brain-trainer-score',
  GAME_SCORES: 'brain-trainer-game-scores',
  RESULTS_HISTORY: 'brain-trainer-results',
} as const;

