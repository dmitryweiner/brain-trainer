import { GameId } from './game.types';

export interface ScoreContextType {
  totalScore: number;
  gameScores: Record<GameId, number>;
  addScore: (gameId: GameId, points: number) => void;
  resetScore: () => void;
  getGameScore: (gameId: GameId) => number;
}

export interface StoredScoreData {
  totalScore: number;
  gameScores: Record<string, number>;
  lastUpdated: string;
}

