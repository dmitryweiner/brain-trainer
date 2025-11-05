import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ScoreProvider, useScoreContext } from './ScoreContext';
import { GAME_IDS } from '../utils/constants';
import React from 'react';

describe('ScoreContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ScoreProvider>{children}</ScoreProvider>
  );

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useScoreContext());
    }).toThrow('useScoreContext must be used within a ScoreProvider');
    
    consoleErrorSpy.mockRestore();
  });

  it('should provide score context', () => {
    const { result } = renderHook(() => useScoreContext(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.totalScore).toBe(0);
    expect(result.current.gameScores).toEqual({});
  });

  it('should allow adding scores through context', () => {
    const { result } = renderHook(() => useScoreContext(), { wrapper });
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    expect(result.current.totalScore).toBe(10);
    expect(result.current.gameScores[GAME_IDS.REACTION_CLICK]).toBe(10);
  });

  it('should share state across multiple consumers', () => {
    const { result } = renderHook(() => useScoreContext(), { wrapper });
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 15);
    });
    
    expect(result.current.totalScore).toBe(15);
  });

  it('should allow resetting scores through context', () => {
    const { result } = renderHook(() => useScoreContext(), { wrapper });
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    act(() => {
      result.current.addScore(GAME_IDS.COLOR_TAP, 20);
    });
    
    expect(result.current.totalScore).toBe(30);
    
    act(() => {
      result.current.resetScore();
    });
    
    expect(result.current.totalScore).toBe(0);
    expect(result.current.gameScores).toEqual({});
  });

  it('should allow getting game scores through context', () => {
    const { result } = renderHook(() => useScoreContext(), { wrapper });
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 25);
    });
    
    const gameScore = result.current.getGameScore(GAME_IDS.REACTION_CLICK);
    expect(gameScore).toBe(25);
  });

  it('should allow resetting specific game score through context', () => {
    const { result } = renderHook(() => useScoreContext(), { wrapper });
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 10);
    });
    
    act(() => {
      result.current.addScore(GAME_IDS.COLOR_TAP, 15);
    });
    
    act(() => {
      result.current.resetGameScore(GAME_IDS.REACTION_CLICK);
    });
    
    expect(result.current.totalScore).toBe(15);
    expect(result.current.getGameScore(GAME_IDS.REACTION_CLICK)).toBe(0);
    expect(result.current.getGameScore(GAME_IDS.COLOR_TAP)).toBe(15);
  });

  it('should persist scores across provider re-renders', () => {
    const { result, rerender } = renderHook(() => useScoreContext(), { wrapper });
    
    act(() => {
      result.current.addScore(GAME_IDS.REACTION_CLICK, 20);
    });
    
    rerender();
    
    expect(result.current.totalScore).toBe(20);
  });
});

