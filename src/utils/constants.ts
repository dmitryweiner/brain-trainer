import type { GameMeta } from '../types/game.types';
import { GAMES } from '../core/games/registry';
import en from '../core/i18n/locales/en.json';

// Идентификаторы игр. color-tap, symbol-match, hidden-number и logic-pair-concept
// сняты с меню (RETIRED_GAMES в core/games/registry.ts), но id зарезервированы.
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
  PHONE_RECALL: 'phone-recall',
  EMOJI_HUNT: 'emoji-hunt',
  FLAGS_GAME: 'flags-game',
} as const;

// Метаданные игр для карточек: выводятся из реестра (core/games/registry.ts).
// title/description — английский текст по умолчанию, UI берёт перевод из i18n.
export const GAMES_META: GameMeta[] = GAMES.map(game => ({
  id: game.id,
  title: en.games[game.id as keyof typeof en.games].title,
  description: en.games[game.id as keyof typeof en.games].description,
  icon: game.icon,
  difficulty: game.difficulty,
}));

// Тайминги
export const TIMINGS = {
  SEQUENCE_SHOW: 800,
  SEQUENCE_PAUSE: 200,
  N_BACK_INTERVAL: 2500,
  BLOCK_PAUSE: 3000,
} as const;

// Размеры сеток
export const GRID_SIZES = {
  MEMORY_FLIP_L1: { rows: 2, cols: 3 },
  MEMORY_FLIP_L2: { rows: 3, cols: 4 },
  MEMORY_FLIP_L3: { rows: 4, cols: 4 },
  MEMORY_FLIP_L4: { rows: 4, cols: 5 },
} as const;

// Количество раундов
export const ROUNDS = {
  EMOJI_HUNT: 10,
} as const;
