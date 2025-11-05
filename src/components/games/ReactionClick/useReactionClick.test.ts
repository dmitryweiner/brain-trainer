import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useReactionClick from './useReactionClick';

describe('useReactionClick', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(result.current.status).toBe('intro');
    expect(result.current.currentAttempt).toBe(0);
    expect(result.current.reactionTimes).toEqual([]);
    expect(result.current.currentScore).toBe(0);
    expect(result.current.tooEarlyCount).toBe(0);
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(typeof result.current.startGame).toBe('function');
    expect(typeof result.current.handleClick).toBe('function');
    expect(typeof result.current.playAgain).toBe('function');
    expect(typeof result.current.getAverageTime).toBe('function');
    expect(typeof result.current.getBestTime).toBe('function');
  });

  it('should change status to waiting when game starts', () => {
    const { result } = renderHook(() => useReactionClick());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('waiting');
  });

  it('should return 0 for average time with no attempts', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(result.current.getAverageTime()).toBe(0);
  });

  it('should return 0 for best time with no attempts', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(result.current.getBestTime()).toBe(0);
  });

  it('should reset game state when play again is called', () => {
    const { result } = renderHook(() => useReactionClick());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.playAgain();
    });

    expect(result.current.currentAttempt).toBe(0);
    expect(result.current.reactionTimes).toEqual([]);
    expect(result.current.currentScore).toBe(0);
    expect(result.current.tooEarlyCount).toBe(0);
  });

  it('should not change state on click during intro', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(result.current.status).toBe('intro');

    act(() => {
      result.current.handleClick();
    });

    expect(result.current.status).toBe('intro');
    expect(result.current.currentAttempt).toBe(0);
  });

  it('should change to tooEarly when clicked during waiting', () => {
    const { result } = renderHook(() => useReactionClick());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('waiting');

    act(() => {
      result.current.handleClick();
    });

    expect(result.current.status).toBe('tooEarly');
    expect(result.current.tooEarlyCount).toBe(1);
  });

  it('should have proper state structure', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(result.current).toHaveProperty('status');
    expect(result.current).toHaveProperty('currentAttempt');
    expect(result.current).toHaveProperty('reactionTimes');
    expect(result.current).toHaveProperty('currentScore');
    expect(result.current).toHaveProperty('tooEarlyCount');
  });

  it('should have proper function structure', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(result.current).toHaveProperty('startGame');
    expect(result.current).toHaveProperty('handleClick');
    expect(result.current).toHaveProperty('playAgain');
    expect(result.current).toHaveProperty('getAverageTime');
    expect(result.current).toHaveProperty('getBestTime');
  });

  it('should maintain currentAttempt as number', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(typeof result.current.currentAttempt).toBe('number');
    expect(result.current.currentAttempt).toBeGreaterThanOrEqual(0);
  });

  it('should maintain currentScore as number', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(typeof result.current.currentScore).toBe('number');
    expect(result.current.currentScore).toBeGreaterThanOrEqual(0);
  });

  it('should maintain tooEarlyCount as number', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(typeof result.current.tooEarlyCount).toBe('number');
    expect(result.current.tooEarlyCount).toBeGreaterThanOrEqual(0);
  });

  it('should initialize reactionTimes as empty array', () => {
    const { result } = renderHook(() => useReactionClick());

    expect(Array.isArray(result.current.reactionTimes)).toBe(true);
    expect(result.current.reactionTimes.length).toBe(0);
  });
});
