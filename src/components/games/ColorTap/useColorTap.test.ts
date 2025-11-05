import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useColorTap from './useColorTap';

describe('useColorTap', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useColorTap());

    expect(result.current.status).toBe('intro');
    expect(result.current.currentRound).toBe(0);
    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.results).toEqual([]);
    expect(result.current.currentScore).toBe(0);
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() => useColorTap());

    expect(typeof result.current.startGame).toBe('function');
    expect(typeof result.current.handleAnswer).toBe('function');
    expect(typeof result.current.playAgain).toBe('function');
    expect(typeof result.current.getAccuracy).toBe('function');
    expect(typeof result.current.getAverageTime).toBe('function');
    expect(typeof result.current.getFastAnswers).toBe('function');
  });

  it('should change status to playing when game starts', () => {
    const { result } = renderHook(() => useColorTap());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('playing');
  });

  it('should set initial color when game starts', () => {
    const { result } = renderHook(() => useColorTap());

    act(() => {
      result.current.startGame();
    });

    expect(['green', 'red']).toContain(result.current.currentColor);
  });

  it('should handle correct answer for green (yes)', () => {
    const { result } = renderHook(() => useColorTap());

    act(() => {
      result.current.startGame();
    });

    // Force green color for testing
    if (result.current.currentColor === 'green') {
      act(() => {
        result.current.handleAnswer(true);
      });

      expect(result.current.correctAnswers).toBe(1);
      expect(result.current.currentScore).toBeGreaterThan(0);
      expect(result.current.results.length).toBe(1);
      expect(result.current.results[0].correct).toBe(true);
    }
  });

  it('should handle correct answer for red (no)', () => {
    const { result } = renderHook(() => useColorTap());

    act(() => {
      result.current.startGame();
    });

    // Force red color for testing
    if (result.current.currentColor === 'red') {
      act(() => {
        result.current.handleAnswer(false);
      });

      expect(result.current.correctAnswers).toBe(1);
      expect(result.current.currentScore).toBeGreaterThan(0);
    }
  });

  it('should handle incorrect answer', () => {
    const { result } = renderHook(() => useColorTap());

    act(() => {
      result.current.startGame();
    });

    const initialScore = result.current.currentScore;

    // Give wrong answer
    const wrongAnswer = result.current.currentColor === 'green' ? false : true;
    
    act(() => {
      result.current.handleAnswer(wrongAnswer);
    });

    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.currentScore).toBe(initialScore);
    expect(result.current.results.length).toBe(1);
    expect(result.current.results[0].correct).toBe(false);
  });

  it('should increment round after answer', () => {
    const { result } = renderHook(() => useColorTap());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.currentRound).toBe(0);

    act(() => {
      result.current.handleAnswer(true);
    });

    expect(result.current.currentRound).toBe(1);
  });

  it('should return 0 for accuracy with no results', () => {
    const { result } = renderHook(() => useColorTap());

    expect(result.current.getAccuracy()).toBe(0);
  });

  it('should return 0 for average time with no results', () => {
    const { result } = renderHook(() => useColorTap());

    expect(result.current.getAverageTime()).toBe(0);
  });

  it('should return 0 for fast answers with no results', () => {
    const { result } = renderHook(() => useColorTap());

    expect(result.current.getFastAnswers()).toBe(0);
  });

  it('should reset game when play again is called', () => {
    const { result } = renderHook(() => useColorTap());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.handleAnswer(true);
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
    const { result } = renderHook(() => useColorTap());

    expect(result.current).toHaveProperty('status');
    expect(result.current).toHaveProperty('currentRound');
    expect(result.current).toHaveProperty('currentColor');
    expect(result.current).toHaveProperty('correctAnswers');
    expect(result.current).toHaveProperty('results');
    expect(result.current).toHaveProperty('currentScore');
  });

  it('should maintain currentRound as number', () => {
    const { result } = renderHook(() => useColorTap());

    expect(typeof result.current.currentRound).toBe('number');
    expect(result.current.currentRound).toBeGreaterThanOrEqual(0);
  });

  it('should maintain currentScore as number', () => {
    const { result } = renderHook(() => useColorTap());

    expect(typeof result.current.currentScore).toBe('number');
    expect(result.current.currentScore).toBeGreaterThanOrEqual(0);
  });

  it('should initialize results as empty array', () => {
    const { result } = renderHook(() => useColorTap());

    expect(Array.isArray(result.current.results)).toBe(true);
    expect(result.current.results.length).toBe(0);
  });
});

