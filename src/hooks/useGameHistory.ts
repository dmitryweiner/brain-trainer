import { useCallback, useMemo } from 'react';
import type { GameId } from '../types/game.types';
import type { Clock } from '../core/platform';
import type { Repository } from '../core/storage/repository';
import { getGame } from '../core/games/registry';
import { buildSession } from '../core/engine/session';
import {
  activeSessions, dailyStats, gameDailyStats, gameStats, type DailyStats, type GameDailyStats, type GameStats,
} from '../core/stats';
import { useEvents } from '../ui/services';

export type { DailyStats, GameDailyStats, GameStats };

/** v1 shape of a finished game, still produced by the games not yet on the engine */
export interface GameResult {
  gameId: GameId;
  score: number;
  /** 0–100 */
  accuracy: number;
  /** ms */
  averageTime: number;
  /** epoch ms */
  timestamp: number;
}

export interface UseGameHistoryReturn {
  /** Counted sessions in v1 shape, oldest first */
  history: GameResult[];
  /** Records a v1-style result as a level-1 session */
  addGameResult: (result: Omit<GameResult, 'timestamp'>) => void;
  getGameHistory: (gameId: GameId) => GameResult[];
  getDailyStats: (days?: number) => DailyStats[];
  getGameDailyStats: (gameId: GameId, days?: number) => GameDailyStats[];
  getGameStats: (gameId: GameId) => GameStats;
  /** Stops counting every session so far (a reset event; nothing is deleted) */
  clearHistory: () => void;
}

/**
 * Adapter over the core repository with the v1 API, so the games and the
 * profile keep working while they move to GameShell (PLAN-IMPROVEMENTS.md, stage 1).
 */
export function useGameHistory(repository: Repository, clock: Clock): UseGameHistoryReturn {
  const events = useEvents(repository);
  const sessions = useMemo(() => activeSessions(events), [events]);

  const history = useMemo<GameResult[]>(
    () => sessions.map(s => ({
      gameId: s.gameId, score: s.score, accuracy: s.accuracy, averageTime: s.avgTimeMs, timestamp: s.startedAt,
    })),
    [sessions],
  );

  const addGameResult = useCallback(
    (result: Omit<GameResult, 'timestamp'>) => {
      const session = buildSession(
        getGame(result.gameId),
        { score: result.score, accuracy: result.accuracy, avgTimeMs: result.averageTime, metrics: {} },
        { id: clock.newId(), startedAt: clock.wallNow(), durationMs: 0, level: 1 },
      );
      repository.addSession(session);
    },
    [repository, clock],
  );

  const getGameHistory = useCallback((gameId: GameId) => history.filter(r => r.gameId === gameId), [history]);

  const getDailyStats = useCallback(
    (days: number = 30) => dailyStats(sessions, days, clock.wallNow()),
    [sessions, clock],
  );

  const getGameDailyStats = useCallback(
    (gameId: GameId, days: number = 14) => gameDailyStats(sessions, gameId, days, clock.wallNow()),
    [sessions, clock],
  );

  const getGameStats = useCallback((gameId: GameId) => gameStats(sessions, gameId), [sessions]);

  const clearHistory = useCallback(() => repository.reset(null), [repository]);

  return { history, addGameResult, getGameHistory, getDailyStats, getGameDailyStats, getGameStats, clearHistory };
}

export default useGameHistory;
