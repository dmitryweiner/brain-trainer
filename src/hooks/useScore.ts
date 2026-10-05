import { useCallback, useMemo } from 'react';
import type { GameId } from '../types/game.types';
import type { Repository } from '../core/storage/repository';
import { totalXp } from '../core/stats';
import { useEvents } from '../ui/services';

export interface UseScoreReturn {
  /** "Очки опыта": every point earned, derived from the event log */
  totalScore: number;
  /** Points earned per game */
  gameScores: Record<string, number>;
  /**
   * Kept for the v1 game components. Points now come from the recorded
   * session (addGameResult), so this does nothing.
   */
  addScore: (gameId: GameId, points: number) => void;
  getGameScore: (gameId: GameId) => number;
}

export function useScore(repository: Repository): UseScoreReturn {
  const events = useEvents(repository);
  const totalScore = useMemo(() => totalXp(events), [events]);
  const gameScores = useMemo(() => {
    const out: Record<string, number> = {};
    for (const e of events) {
      if (e.kind === 'session') out[e.session.gameId] = (out[e.session.gameId] ?? 0) + e.session.score;
    }
    return out;
  }, [events]);

  const addScore = useCallback(() => undefined, []);
  const getGameScore = useCallback((gameId: GameId) => gameScores[gameId] ?? 0, [gameScores]);

  return { totalScore, gameScores, addScore, getGameScore };
}

export default useScore;
