import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScore } from './useScore';
import { GAME_IDS } from '../utils/constants';

describe('useScore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with zero scores', () => {
    const { result } = renderHook(() => useScore());
    
    expect(result.current.totalScore).toBe(0);
    expect(result.current.gameScores).toEqual({});
  });

  it('should add score to total and game', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    expect(result.current.totalScore).toBe(10);
    expect(result.current.gameScores[GAME_IDS.REACTION_CLICK]).toBe(10);
  });

  it('should accumulate scores from multiple games', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    act(() => {
      result.current.addScore(GAME_IDS.COLOR_TAP, 15);
    });
    
    expect(result.current.totalScore).toBe(25);
    expect(result.current.gameScores[GAME_IDS.REACTION_CLICK]).toBe(10);
    expect(result.current.gameScores[GAME_IDS.COLOR_TAP]).toBe(15);
  });

  it('should accumulate scores for the same game', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 5);
    });
    
    expect(result.current.totalScore).toBe(15);
    expect(result.current.gameScores[GAME_IDS.REACTION_CLICK]).toBe(15);
  });

  it('should get game score', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 20);
    });
    
    const score = result.current.getGameScore(GAME_IDS.REACTION_CLICK);
    expect(score).toBe(20);
  });

  it('should return 0 for game with no score', () => {
    const { result } = renderHook(() => useScore());
    
    const score = result.current.getGameScore(GAME_IDS.REACTION_CLICK);
    expect(score).toBe(0);
  });

  it('should reset all scores', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    act(() => {
      result.current.addScore(GAME_IDS.COLOR_TAP, 15);
    });
    
    expect(result.current.totalScore).toBe(25);
    
    act(() => {
      result.current.resetScore();
    });
    
    expect(result.current.totalScore).toBe(0);
    expect(result.current.gameScores).toEqual({});
  });

  it('should reset specific game score', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    act(() => {
      result.current.addScore(GAME_IDS.COLOR_TAP, 15);
    });
    
    expect(result.current.totalScore).toBe(25);
    
    act(() => {
      result.current.resetGameScore(GAME_IDS.REACTION_CLICK);
    });
    
    expect(result.current.totalScore).toBe(15);
    expect(result.current.gameScores[GAME_IDS.REACTION_CLICK]).toBeUndefined();
    expect(result.current.gameScores[GAME_IDS.COLOR_TAP]).toBe(15);
  });

  it('should not add negative points', () => {
    const { result } = renderHook(() => useScore());
    
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, -10);
    });
    
    expect(result.current.totalScore).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Cannot add negative points');
    
    consoleWarnSpy.mockRestore();
  });

  it('should persist scores in localStorage', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    // Create a new instance to check if it loads from localStorage
    const { result: result2 } = renderHook(() => useScore());
    
    expect(result2.current.totalScore).toBe(10);
    expect(result2.current.gameScores[GAME_IDS.REACTION_CLICK]).toBe(10);
  });

  it('should handle resetting non-existent game score', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.COLOR_TAP, 15);
    });
    
    act(() => {
      result.current.resetGameScore(GAME_IDS.REACTION_CLICK);
    });
    
    expect(result.current.totalScore).toBe(15);
    expect(result.current.gameScores[GAME_IDS.COLOR_TAP]).toBe(15);
  });

  it('should not let total score go below zero when resetting game', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    // Manually set totalScore lower than game score (edge case)
    act(() => {
      result.current.resetGameScore(GAME_IDS.REACTION_CLICK);
    });
    
    expect(result.current.totalScore).toBe(0);
  });

  it('should handle multiple games scoring simultaneously', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 5);
    });
    
    act(() => {
      result.current.addScore(GAME_IDS.COLOR_TAP, 10);
    });
    
    act(() => {
      result.current.addScore(GAME_IDS.SYMBOL_MATCH, 7);
    });
    
    expect(result.current.totalScore).toBe(22);
    expect(result.current.gameScores[GAME_IDS.REACTION_CLICK]).toBe(5);
    expect(result.current.gameScores[GAME_IDS.COLOR_TAP]).toBe(10);
    expect(result.current.gameScores[GAME_IDS.SYMBOL_MATCH]).toBe(7);
  });

  it('should handle decimal points', () => {
    const { result } = renderHook(() => useScore());
    
    act(() => {
      result.current.addScore(GAME_IDS.COLOR_TAP, 12.5);
    });
    
    expect(result.current.totalScore).toBe(12.5);
    expect(result.current.gameScores[GAME_IDS.COLOR_TAP]).toBe(12.5);
  });
});

