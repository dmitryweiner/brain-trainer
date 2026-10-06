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
