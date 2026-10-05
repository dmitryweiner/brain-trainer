import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScore } from './useScore';
import { useGameHistory } from './useGameHistory';
import { createWebServices } from '../ui/webServices';
import { GAME_IDS } from '../utils/constants';

describe('useScore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup() {
    const services = createWebServices();
    return renderHook(() => ({
      score: useScore(services.repository),
      history: useGameHistory(services.repository, services.clock),
    }));
  }

  it('starts at zero', () => {
    const { result } = setup();
    expect(result.current.score.totalScore).toBe(0);
    expect(result.current.score.gameScores).toEqual({});
  });

  it('derives XP and per-game points from recorded sessions', () => {
    const { result } = setup();
    act(() => {
      result.current.history.addGameResult({ gameId: GAME_IDS.REACTION_CLICK, score: 10, accuracy: 100, averageTime: 300 });
      result.current.history.addGameResult({ gameId: GAME_IDS.N_BACK, score: 2.5, accuracy: 50, averageTime: 900 });
      result.current.history.addGameResult({ gameId: GAME_IDS.REACTION_CLICK, score: 5, accuracy: 100, averageTime: 300 });
    });
    expect(result.current.score.totalScore).toBe(17.5);
    expect(result.current.score.getGameScore(GAME_IDS.REACTION_CLICK)).toBe(15);
    expect(result.current.score.getGameScore(GAME_IDS.FLAGS_GAME)).toBe(0);
  });

  it('does not double count: addScore is a no-op next to addGameResult', () => {
    const { result } = setup();
    act(() => {
      result.current.score.addScore(GAME_IDS.REACTION_CLICK, 10);
      result.current.history.addGameResult({ gameId: GAME_IDS.REACTION_CLICK, score: 10, accuracy: 100, averageTime: 300 });
    });
    expect(result.current.score.totalScore).toBe(10);
  });

  it('keeps XP after the history is cleared', () => {
    const { result } = setup();
    act(() => {
      result.current.history.addGameResult({ gameId: GAME_IDS.REACTION_CLICK, score: 10, accuracy: 100, averageTime: 300 });
    });
    act(() => {
      result.current.history.clearHistory();
    });
    expect(result.current.history.history).toEqual([]);
    expect(result.current.score.totalScore).toBe(10);
  });

  it('carries over v1 XP', () => {
    localStorage.setItem('brain-trainer-score', '42');
    localStorage.setItem('brain-trainer-results', JSON.stringify([
      { gameId: 'reaction-click', score: 12, accuracy: 100, averageTime: 300, timestamp: 1700000000000 },
    ]));
    const { result } = setup();
    expect(result.current.score.totalScore).toBe(42);
    expect(result.current.score.getGameScore(GAME_IDS.REACTION_CLICK)).toBe(12);
  });
});
