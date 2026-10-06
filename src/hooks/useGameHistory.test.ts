import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameHistory } from './useGameHistory';
import { createWebServices } from '../ui/webServices';
import { STORAGE_KEYS } from '../core/storage/migrate';

describe('useGameHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup() {
    const services = createWebServices();
    const hook = renderHook(() => useGameHistory(services.repository, services.clock));
    return { ...hook, services };
  }

  it('starts empty', () => {
    const { result } = setup();
    expect(result.current.history).toEqual([]);
  });

  it('records a v1-style result as a session and returns it in v1 shape', () => {
    const { result } = setup();
    const before = Date.now();
    act(() => {
      result.current.addGameResult({ gameId: 'reaction-click', score: 15, accuracy: 80, averageTime: 350 });
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({ gameId: 'reaction-click', score: 15, accuracy: 80, averageTime: 350 });
    expect(result.current.history[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it('stores v2 sessions rated on the v1 scale', async () => {
    const { result, services } = setup();
    act(() => {
      result.current.addGameResult({ gameId: 'reaction-click', score: 20, accuracy: 100, averageTime: 300 });
    });
    await services.repository.flush();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.v2)!);
    expect(stored.schemaVersion).toBe(2);
    // v1-style result (no metrics): 20 of 25 v1 points on the Reaction Click scale
    expect(stored.events[0].session).toMatchObject({ gameId: 'reaction-click', level: 1, rating: 750 });
  });

  it('filters by game and computes stats', () => {
    const { result } = setup();
    act(() => {
      result.current.addGameResult({ gameId: 'reaction-click', score: 10, accuracy: 80, averageTime: 300 });
      result.current.addGameResult({ gameId: 'reaction-click', score: 20, accuracy: 100, averageTime: 250 });
      result.current.addGameResult({ gameId: 'n-back', score: 30, accuracy: 70, averageTime: 900 });
    });
    expect(result.current.getGameHistory('reaction-click')).toHaveLength(2);
    expect(result.current.getGameStats('reaction-click')).toMatchObject({
      totalGames: 2, bestScore: 20, averageScore: 15, averageAccuracy: 90,
    });
    expect(result.current.getGameStats('flags-game')).toMatchObject({ totalGames: 0, bestScore: 0 });
  });

  it('clears history with a reset, keeping the sessions in the log', () => {
    const { result, services } = setup();
    act(() => {
      result.current.addGameResult({ gameId: 'reaction-click', score: 10, accuracy: 80, averageTime: 300 });
    });
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.history).toEqual([]);
    expect(services.repository.events.map(e => e.kind)).toEqual(['session', 'reset']);
  });

  it('groups today in daily stats', () => {
    const { result } = setup();
    act(() => {
      result.current.addGameResult({ gameId: 'reaction-click', score: 10, accuracy: 80, averageTime: 300 });
      result.current.addGameResult({ gameId: 'n-back', score: 6, accuracy: 60, averageTime: 900 });
    });
    const [today] = result.current.getDailyStats(7);
    expect(today).toMatchObject({ gamesPlayed: 2, totalScore: 16, averageAccuracy: 70 });
    expect(result.current.getGameDailyStats('n-back', 7)).toHaveLength(1);
  });

  it('reads v1 history through the migration', () => {
    localStorage.setItem('brain-trainer-results', JSON.stringify([
      { gameId: 'flags-game', score: 50, accuracy: 60, averageTime: 3000, timestamp: Date.now() - 1000 },
    ]));
    const { result } = setup();
    expect(result.current.history).toHaveLength(1);
    // 50 of the v1 maximum 100, at level 1 (ceiling 460)
    expect(result.current.getGameStats('flags-game').bestRating).toBe(230);
  });
});
