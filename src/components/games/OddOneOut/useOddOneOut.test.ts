import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useOddOneOut from './useOddOneOut';

describe('useOddOneOut', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useOddOneOut());

    expect(result.current.status).toBe('intro');
    expect(result.current.currentRound).toBe(0);
    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.results).toEqual([]);
    expect(result.current.currentScore).toBe(0);
    expect(result.current.lastAnswerCorrect).toBe(null);
    expect(result.current.emojis).toEqual([]);
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() => useOddOneOut());

    expect(typeof result.current.startGame).toBe('function');
    expect(typeof result.current.handleEmojiClick).toBe('function');
    expect(typeof result.current.playAgain).toBe('function');
    expect(typeof result.current.getAccuracy).toBe('function');
    expect(typeof result.current.getAverageTime).toBe('function');
  });

  it('should change status to playing when game starts', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('playing');
  });

  it('should generate 4 emojis when game starts', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.emojis).toHaveLength(4);
    expect(result.current.emojis.every(e => typeof e === 'string')).toBe(true);
  });

  it('should set difficulty to easy for first rounds', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.currentDifficulty).toBe('easy');
  });

  it('should have valid oddOneIndex', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.oddOneIndex).toBeGreaterThanOrEqual(0);
    expect(result.current.oddOneIndex).toBeLessThan(4);
  });

  it('should handle correct click', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    const correctIndex = result.current.oddOneIndex;

    act(() => {
      result.current.handleEmojiClick(correctIndex);
    });

    expect(result.current.correctAnswers).toBe(1);
    expect(result.current.currentScore).toBe(1);
    expect(result.current.lastAnswerCorrect).toBe(true);
  });

  it('should handle incorrect click', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    const correctIndex = result.current.oddOneIndex;
    const wrongIndex = (correctIndex + 1) % 4;

    act(() => {
      result.current.handleEmojiClick(wrongIndex);
    });

    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.currentScore).toBe(0);
    expect(result.current.lastAnswerCorrect).toBe(false);
  });

  it('should increment round after click', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.currentRound).toBe(0);

    act(() => {
      result.current.handleEmojiClick(0);
    });

    expect(result.current.currentRound).toBe(1);
  });

  it('should store result details', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.handleEmojiClick(0);
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0]).toHaveProperty('correct');
    expect(result.current.results[0]).toHaveProperty('time');
    expect(result.current.results[0]).toHaveProperty('difficulty');
    expect(result.current.results[0].difficulty).toBe('easy');
  });

  it('should return 0 for accuracy with no results', () => {
    const { result } = renderHook(() => useOddOneOut());

    expect(result.current.getAccuracy()).toBe(0);
  });

  it('should return 0 for average time with no results', () => {
    const { result } = renderHook(() => useOddOneOut());

    expect(result.current.getAverageTime()).toBe(0);
  });

  it('should calculate accuracy correctly', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    const correctIndex = result.current.oddOneIndex;

    act(() => {
      result.current.handleEmojiClick(correctIndex);
    });

    expect(result.current.getAccuracy()).toBe(100);
  });

  it('should reset game when play again is called', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.handleEmojiClick(0);
    });

    expect(result.current.currentRound).toBe(1);

    act(() => {
      result.current.playAgain();
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.currentRound).toBe(0);
    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.results).toEqual([]);
    expect(result.current.currentScore).toBe(0);
  });

  it('should have proper state structure', () => {
    const { result } = renderHook(() => useOddOneOut());

    expect(result.current).toHaveProperty('status');
    expect(result.current).toHaveProperty('currentRound');
    expect(result.current).toHaveProperty('emojis');
    expect(result.current).toHaveProperty('oddOneIndex');
    expect(result.current).toHaveProperty('correctAnswers');
    expect(result.current).toHaveProperty('results');
    expect(result.current).toHaveProperty('currentScore');
    expect(result.current).toHaveProperty('currentDifficulty');
  });

  it('should maintain currentRound as number', () => {
    const { result } = renderHook(() => useOddOneOut());

    expect(typeof result.current.currentRound).toBe('number');
    expect(result.current.currentRound).toBeGreaterThanOrEqual(0);
  });

  it('should maintain currentScore as number', () => {
    const { result } = renderHook(() => useOddOneOut());

    expect(typeof result.current.currentScore).toBe('number');
    expect(result.current.currentScore).toBeGreaterThanOrEqual(0);
  });

  it('should initialize results as empty array', () => {
    const { result } = renderHook(() => useOddOneOut());

    expect(Array.isArray(result.current.results)).toBe(true);
    expect(result.current.results.length).toBe(0);
  });

  it('should set lastAnswerCorrect after click', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.lastAnswerCorrect).toBe(null);

    act(() => {
      result.current.handleEmojiClick(0);
    });

    expect(result.current.lastAnswerCorrect).not.toBe(null);
    expect(typeof result.current.lastAnswerCorrect).toBe('boolean');
  });

  it('should have exactly one odd emoji in the grid', () => {
    const { result } = renderHook(() => useOddOneOut());

    act(() => {
      result.current.startGame();
    });

    const emojis = result.current.emojis;
    const uniqueEmojis = new Set(emojis);
    
    // Should have 2 unique emojis (3 of one type, 1 of another)
    expect(uniqueEmojis.size).toBe(2);

    // Count occurrences
    const counts = new Map<string, number>();
    emojis.forEach(e => {
      counts.set(e, (counts.get(e) || 0) + 1);
    });

    const countsArray = Array.from(counts.values()).sort();
    expect(countsArray).toEqual([1, 3]); // One emoji appears once, another 3 times
  });
});

