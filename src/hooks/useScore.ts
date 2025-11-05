import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../utils/constants';
import type { GameId } from '../types/game.types';

export interface UseScoreReturn {
  /** Общий счёт */
  totalScore: number;
  /** Счета по играм */
  gameScores: Record<string, number>;
  /** Добавить очки */
  addScore: (gameId: GameId, points: number) => void;
  /** Получить счёт игры */
  getGameScore: (gameId: GameId) => number;
  /** Сбросить весь счёт */
  resetScore: () => void;
  /** Сбросить счёт конкретной игры */
  resetGameScore: (gameId: GameId) => void;
}

/**
 * Хук для управления счётом пользователя
 * Автоматически сохраняет данные в LocalStorage
 */
export function useScore(): UseScoreReturn {
  const [totalScore, setTotalScore] = useLocalStorage(STORAGE_KEYS.TOTAL_SCORE, 0);
  const [gameScores, setGameScores] = useLocalStorage<Record<string, number>>(
    STORAGE_KEYS.GAME_SCORES,
    {}
  );

  const addScore = useCallback(
    (gameId: GameId, points: number) => {
      if (points < 0) {
        console.warn('Cannot add negative points');
        return;
      }

      setTotalScore(prev => prev + points);
      setGameScores(prev => ({
        ...prev,
        [gameId]: (prev[gameId] || 0) + points,
      }));
    },
    [setTotalScore, setGameScores]
  );

  const getGameScore = useCallback(
    (gameId: GameId): number => {
      return gameScores[gameId] || 0;
    },
    [gameScores]
  );

  const resetScore = useCallback(() => {
    setTotalScore(0);
    setGameScores({});
  }, [setTotalScore, setGameScores]);

  const resetGameScore = useCallback(
    (gameId: GameId) => {
      const currentGameScore = gameScores[gameId] || 0;
      
      setTotalScore(prev => Math.max(0, prev - currentGameScore));
      setGameScores(prev => {
        const newScores = { ...prev };
        delete newScores[gameId];
        return newScores;
      });
    },
    [gameScores, setTotalScore, setGameScores]
  );

  return {
    totalScore,
    gameScores,
    addScore,
    getGameScore,
    resetScore,
    resetGameScore,
  };
}

export default useScore;

