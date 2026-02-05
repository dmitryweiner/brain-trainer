import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../utils/constants';
import type { GameId } from '../types/game.types';

/** Detailed result of a single game session */
export interface GameResult {
  /** Game identifier */
  gameId: GameId;
  /** Score achieved in this session */
  score: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Average reaction/response time in ms */
  averageTime: number;
  /** Timestamp when game was completed */
  timestamp: number;
}

/** Statistics for a single day */
export interface DailyStats {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Total games played */
  gamesPlayed: number;
  /** Total score earned */
  totalScore: number;
  /** Average accuracy across all games */
  averageAccuracy: number;
  /** Games breakdown by gameId */
  gameBreakdown: Record<string, {
    count: number;
    totalScore: number;
    avgAccuracy: number;
  }>;
}

/** Daily statistics for a specific game */
export interface GameDailyStats {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Number of games played */
  gamesPlayed: number;
  /** Average score for this day */
  averageScore: number;
  /** Average accuracy for this day */
  averageAccuracy: number;
}

export interface UseGameHistoryReturn {
  /** All game results history */
  history: GameResult[];
  /** Add a new game result */
  addGameResult: (result: Omit<GameResult, 'timestamp'>) => void;
  /** Get history for a specific game */
  getGameHistory: (gameId: GameId) => GameResult[];
  /** Get daily statistics */
  getDailyStats: (days?: number) => DailyStats[];
  /** Get daily statistics for a specific game */
  getGameDailyStats: (gameId: GameId, days?: number) => GameDailyStats[];
  /** Get statistics for a specific game */
  getGameStats: (gameId: GameId) => {
    totalGames: number;
    bestScore: number;
    averageScore: number;
    averageAccuracy: number;
    recentTrend: 'improving' | 'declining' | 'stable';
  };
  /** Clear all history */
  clearHistory: () => void;
}

/**
 * Hook for managing detailed game history and statistics
 */
export function useGameHistory(): UseGameHistoryReturn {
  const [history, setHistory] = useLocalStorage<GameResult[]>(
    STORAGE_KEYS.RESULTS_HISTORY,
    []
  );

  const addGameResult = useCallback(
    (result: Omit<GameResult, 'timestamp'>) => {
      const newResult: GameResult = {
        ...result,
        timestamp: Date.now(),
      };
      setHistory(prev => [...prev, newResult]);
    },
    [setHistory]
  );

  const getGameHistory = useCallback(
    (gameId: GameId): GameResult[] => {
      return history.filter(r => r.gameId === gameId);
    },
    [history]
  );

  const getDailyStats = useCallback(
    (days: number = 30): DailyStats[] => {
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Filter results within the date range
      const filteredResults = history.filter(
        r => r.timestamp >= cutoffDate.getTime()
      );

      // Group by date
      const dailyMap = new Map<string, GameResult[]>();
      
      filteredResults.forEach(result => {
        const date = new Date(result.timestamp);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, []);
        }
        dailyMap.get(dateKey)!.push(result);
      });

      // Convert to DailyStats array
      const stats: DailyStats[] = [];
      
      dailyMap.forEach((results, date) => {
        const gameBreakdown: DailyStats['gameBreakdown'] = {};
        
        results.forEach(r => {
          if (!gameBreakdown[r.gameId]) {
            gameBreakdown[r.gameId] = {
              count: 0,
              totalScore: 0,
              avgAccuracy: 0,
            };
          }
          gameBreakdown[r.gameId].count++;
          gameBreakdown[r.gameId].totalScore += r.score;
        });

        // Calculate average accuracy per game
        Object.keys(gameBreakdown).forEach(gameId => {
          const gameResults = results.filter(r => r.gameId === gameId);
          gameBreakdown[gameId].avgAccuracy = 
            gameResults.reduce((sum, r) => sum + r.accuracy, 0) / gameResults.length;
        });

        stats.push({
          date,
          gamesPlayed: results.length,
          totalScore: results.reduce((sum, r) => sum + r.score, 0),
          averageAccuracy: results.reduce((sum, r) => sum + r.accuracy, 0) / results.length,
          gameBreakdown,
        });
      });

      // Sort by date descending (most recent first)
      return stats.sort((a, b) => b.date.localeCompare(a.date));
    },
    [history]
  );

  const getGameDailyStats = useCallback(
    (gameId: GameId, days: number = 14): GameDailyStats[] => {
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Filter results for this game within the date range
      const filteredResults = history.filter(
        r => r.gameId === gameId && r.timestamp >= cutoffDate.getTime()
      );

      if (filteredResults.length === 0) {
        return [];
      }

      // Group by date
      const dailyMap = new Map<string, GameResult[]>();
      
      filteredResults.forEach(result => {
        const date = new Date(result.timestamp);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, []);
        }
        dailyMap.get(dateKey)!.push(result);
      });

      // Convert to GameDailyStats array
      const stats: GameDailyStats[] = [];
      
      dailyMap.forEach((results, date) => {
        const gamesPlayed = results.length;
        const averageScore = results.reduce((sum, r) => sum + r.score, 0) / gamesPlayed;
        const averageAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / gamesPlayed;

        stats.push({
          date,
          gamesPlayed,
          averageScore: Math.round(averageScore * 10) / 10,
          averageAccuracy: Math.round(averageAccuracy * 10) / 10,
        });
      });

      // Sort by date ascending (oldest first for charts)
      return stats.sort((a, b) => a.date.localeCompare(b.date));
    },
    [history]
  );

  const getGameStats = useCallback(
    (gameId: GameId) => {
      const gameHistory = getGameHistory(gameId);
      
      if (gameHistory.length === 0) {
        return {
          totalGames: 0,
          bestScore: 0,
          averageScore: 0,
          averageAccuracy: 0,
          recentTrend: 'stable' as const,
        };
      }

      const totalGames = gameHistory.length;
      const bestScore = Math.max(...gameHistory.map(r => r.score));
      const averageScore = gameHistory.reduce((sum, r) => sum + r.score, 0) / totalGames;
      const averageAccuracy = gameHistory.reduce((sum, r) => sum + r.accuracy, 0) / totalGames;

      // Calculate trend based on last 5 games vs previous 5
      let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (gameHistory.length >= 6) {
        const sorted = [...gameHistory].sort((a, b) => b.timestamp - a.timestamp);
        const recent5 = sorted.slice(0, 5);
        const previous5 = sorted.slice(5, 10);
        
        if (previous5.length > 0) {
          const recentAvg = recent5.reduce((sum, r) => sum + r.score, 0) / recent5.length;
          const previousAvg = previous5.reduce((sum, r) => sum + r.score, 0) / previous5.length;
          
          const diff = recentAvg - previousAvg;
          if (diff > previousAvg * 0.1) {
            recentTrend = 'improving';
          } else if (diff < -previousAvg * 0.1) {
            recentTrend = 'declining';
          }
        }
      }

      return {
        totalGames,
        bestScore,
        averageScore: Math.round(averageScore * 10) / 10,
        averageAccuracy: Math.round(averageAccuracy * 10) / 10,
        recentTrend,
      };
    },
    [getGameHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  return {
    history,
    addGameResult,
    getGameHistory,
    getDailyStats,
    getGameDailyStats,
    getGameStats,
    clearHistory,
  };
}

export default useGameHistory;

