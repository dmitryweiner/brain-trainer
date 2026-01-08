import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameHistory } from './useGameHistory';
import { STORAGE_KEYS } from '../utils/constants';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useGameHistory', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useGameHistory());
    
    expect(result.current.history).toEqual([]);
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() => useGameHistory());

    expect(typeof result.current.addGameResult).toBe('function');
    expect(typeof result.current.getGameHistory).toBe('function');
    expect(typeof result.current.getDailyStats).toBe('function');
    expect(typeof result.current.getGameStats).toBe('function');
    expect(typeof result.current.clearHistory).toBe('function');
  });

  it('should add game result with timestamp', () => {
    const { result } = renderHook(() => useGameHistory());

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 25,
        accuracy: 80,
        averageTime: 350,
      });
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].gameId).toBe('reaction-click');
    expect(result.current.history[0].score).toBe(25);
    expect(result.current.history[0].accuracy).toBe(80);
    expect(result.current.history[0].averageTime).toBe(350);
    expect(result.current.history[0].timestamp).toBeDefined();
    expect(typeof result.current.history[0].timestamp).toBe('number');
  });

  it('should get game history for specific game', () => {
    const { result } = renderHook(() => useGameHistory());

    // Add results one by one to ensure state updates properly
    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 25,
        accuracy: 80,
        averageTime: 350,
      });
    });

    act(() => {
      result.current.addGameResult({
        gameId: 'color-tap',
        score: 30,
        accuracy: 90,
        averageTime: 400,
      });
    });

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 28,
        accuracy: 85,
        averageTime: 320,
      });
    });

    const reactionHistory = result.current.getGameHistory('reaction-click');
    expect(reactionHistory).toHaveLength(2);
    expect(reactionHistory.every(r => r.gameId === 'reaction-click')).toBe(true);

    const colorHistory = result.current.getGameHistory('color-tap');
    expect(colorHistory).toHaveLength(1);
  });

  it('should get game stats correctly', () => {
    const { result } = renderHook(() => useGameHistory());

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 20,
        accuracy: 80,
        averageTime: 350,
      });
    });

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 30,
        accuracy: 90,
        averageTime: 300,
      });
    });

    const stats = result.current.getGameStats('reaction-click');
    
    expect(stats.totalGames).toBe(2);
    expect(stats.bestScore).toBe(30);
    expect(stats.averageScore).toBe(25);
    expect(stats.averageAccuracy).toBe(85);
    expect(stats.recentTrend).toBe('stable'); // Not enough games for trend
  });

  it('should return empty stats for game with no history', () => {
    const { result } = renderHook(() => useGameHistory());

    const stats = result.current.getGameStats('reaction-click');
    
    expect(stats.totalGames).toBe(0);
    expect(stats.bestScore).toBe(0);
    expect(stats.averageScore).toBe(0);
    expect(stats.averageAccuracy).toBe(0);
    expect(stats.recentTrend).toBe('stable');
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useGameHistory());

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 25,
        accuracy: 80,
        averageTime: 350,
      });
    });

    expect(result.current.history).toHaveLength(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toHaveLength(0);
  });

  it('should get daily stats', () => {
    const { result } = renderHook(() => useGameHistory());

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 25,
        accuracy: 80,
        averageTime: 350,
      });
    });

    act(() => {
      result.current.addGameResult({
        gameId: 'color-tap',
        score: 30,
        accuracy: 90,
        averageTime: 400,
      });
    });

    const dailyStats = result.current.getDailyStats();
    
    // Should have at least one day (today)
    expect(dailyStats.length).toBeGreaterThanOrEqual(1);
    
    const todayStats = dailyStats[0];
    expect(todayStats.gamesPlayed).toBe(2);
    expect(todayStats.totalScore).toBe(55);
    expect(todayStats.averageAccuracy).toBe(85);
    expect(todayStats.gameBreakdown['reaction-click']).toBeDefined();
    expect(todayStats.gameBreakdown['color-tap']).toBeDefined();
  });

  it('should save history to localStorage', () => {
    const { result } = renderHook(() => useGameHistory());

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 25,
        accuracy: 80,
        averageTime: 350,
      });
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.RESULTS_HISTORY,
      expect.any(String)
    );
  });

  it('should maintain proper state structure', () => {
    const { result } = renderHook(() => useGameHistory());

    expect(result.current).toHaveProperty('history');
    expect(result.current).toHaveProperty('addGameResult');
    expect(result.current).toHaveProperty('getGameHistory');
    expect(result.current).toHaveProperty('getDailyStats');
    expect(result.current).toHaveProperty('getGameStats');
    expect(result.current).toHaveProperty('clearHistory');
  });

  it('should initialize history as empty array', () => {
    const { result } = renderHook(() => useGameHistory());

    expect(Array.isArray(result.current.history)).toBe(true);
    expect(result.current.history.length).toBe(0);
  });

  it('should accumulate multiple results', () => {
    const { result } = renderHook(() => useGameHistory());

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 25,
        accuracy: 80,
        averageTime: 350,
      });
    });

    expect(result.current.history).toHaveLength(1);

    act(() => {
      result.current.addGameResult({
        gameId: 'color-tap',
        score: 30,
        accuracy: 90,
        averageTime: 400,
      });
    });

    expect(result.current.history).toHaveLength(2);

    act(() => {
      result.current.addGameResult({
        gameId: 'reaction-click',
        score: 28,
        accuracy: 85,
        averageTime: 320,
      });
    });

    expect(result.current.history).toHaveLength(3);
  });
});

