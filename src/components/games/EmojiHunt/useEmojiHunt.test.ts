import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useEmojiHunt from './useEmojiHunt';

describe('useEmojiHunt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useEmojiHunt());

    expect(result.current.status).toBe('intro');
    expect(result.current.currentRound).toBe(0);
    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.results).toEqual([]);
    expect(result.current.currentScore).toBe(0);
    expect(result.current.lastAnswerCorrect).toBe(null);
    expect(result.current.grid).toEqual([]);
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() => useEmojiHunt());

    expect(typeof result.current.startGame).toBe('function');
    expect(typeof result.current.handleCellClick).toBe('function');
    expect(typeof result.current.playAgain).toBe('function');
    expect(typeof result.current.getAccuracy).toBe('function');
    expect(typeof result.current.getAverageTime).toBe('function');
  });

  it('should change status to playing when game starts', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('playing');
  });

  it('should generate 3x3 grid for easy rounds', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.gridSize).toBe(3);
    expect(result.current.grid).toHaveLength(9); // 3x3 = 9
  });

  it('should set difficulty to easy for first rounds', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.currentDifficulty).toBe('easy');
  });

  it('should have a target emoji', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.targetEmoji).toBeTruthy();
    expect(typeof result.current.targetEmoji).toBe('string');
  });

  it('should include target emoji in grid', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.grid).toContain(result.current.targetEmoji);
  });

  it('should handle correct click', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    const targetIndex = result.current.grid.findIndex(
      emoji => emoji === result.current.targetEmoji
    );

    act(() => {
      result.current.handleCellClick(targetIndex);
    });

    expect(result.current.correctAnswers).toBe(1);
    expect(result.current.lastAnswerCorrect).toBe(true);
  });

  it('should handle incorrect click', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    const targetIndex = result.current.grid.findIndex(
      emoji => emoji === result.current.targetEmoji
    );
    const wrongIndex = targetIndex === 0 ? 1 : 0;

    act(() => {
      result.current.handleCellClick(wrongIndex);
    });

    expect(result.current.lastAnswerCorrect).toBe(false);
    expect(result.current.correctAnswers).toBe(0);
  });

  it('should increment round after click', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.currentRound).toBe(0);

    act(() => {
      result.current.handleCellClick(0);
    });

    expect(result.current.currentRound).toBe(1);
  });

  it('should store result details', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.handleCellClick(0);
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0]).toHaveProperty('correct');
    expect(result.current.results[0]).toHaveProperty('time');
    expect(result.current.results[0]).toHaveProperty('difficulty');
    expect(result.current.results[0]).toHaveProperty('gridSize');
    expect(result.current.results[0].difficulty).toBe('easy');
    expect(result.current.results[0].gridSize).toBe(3);
  });

  it('should return 0 for accuracy with no results', () => {
    const { result } = renderHook(() => useEmojiHunt());

    expect(result.current.getAccuracy()).toBe(0);
  });

  it('should return 0 for average time with no results', () => {
    const { result } = renderHook(() => useEmojiHunt());

    expect(result.current.getAverageTime()).toBe(0);
  });

  it('should calculate accuracy correctly', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    const targetIndex = result.current.grid.findIndex(
      emoji => emoji === result.current.targetEmoji
    );

    act(() => {
      result.current.handleCellClick(targetIndex);
    });

    expect(result.current.getAccuracy()).toBe(100);
  });

  it('should reset game when play again is called', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.handleCellClick(0);
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
    const { result } = renderHook(() => useEmojiHunt());

    expect(result.current).toHaveProperty('status');
    expect(result.current).toHaveProperty('currentRound');
    expect(result.current).toHaveProperty('grid');
    expect(result.current).toHaveProperty('gridSize');
    expect(result.current).toHaveProperty('targetEmoji');
    expect(result.current).toHaveProperty('correctAnswers');
    expect(result.current).toHaveProperty('results');
    expect(result.current).toHaveProperty('currentScore');
    expect(result.current).toHaveProperty('currentDifficulty');
  });

  it('should progress to medium difficulty', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    // Complete 3 easy rounds (rounds 0, 1, 2)
    // After round 2, the game will progress to round 3 which is medium
    for (let i = 0; i < 3; i++) {
      // Wait for playing status before clicking
      await waitFor(
        () => {
          expect(result.current.status).toBe('playing');
        },
        { timeout: 2000 }
      );

      await act(async () => {
        result.current.handleCellClick(0);
      });

      // Wait for feedback to pass
      await waitFor(
        () => {
          expect(result.current.status === 'playing' || result.current.status === 'feedback').toBe(true);
        },
        { timeout: 2000 }
      );
    }

    // Wait for transition from feedback to playing with medium difficulty
    await waitFor(
      () => {
        expect(result.current.status).toBe('playing');
        expect(result.current.currentDifficulty).toBe('medium');
      },
      { timeout: 3000 }
    );

    vi.useFakeTimers();
  });

  it('should increase grid size for medium difficulty', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    // Complete 3 easy rounds
    for (let i = 0; i < 3; i++) {
      await waitFor(
        () => {
          expect(result.current.status).toBe('playing');
        },
        { timeout: 2000 }
      );

      await act(async () => {
        result.current.handleCellClick(0);
      });
    }

    // Wait for round 4 (index 3) which is medium difficulty with 4x4 grid
    await waitFor(
      () => {
        expect(result.current.gridSize).toBe(4);
        expect(result.current.grid).toHaveLength(16); // 4x4
      },
      { timeout: 3000 }
    );

    vi.useFakeTimers();
  });

  it('should award points based on grid size', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    const targetIndex = result.current.grid.findIndex(
      emoji => emoji === result.current.targetEmoji
    );

    act(() => {
      result.current.handleCellClick(targetIndex);
    });

    // Base points = gridSize (3) + possible time bonus
    expect(result.current.currentScore).toBeGreaterThanOrEqual(3);
  });

  it('should initialize results as empty array', () => {
    const { result } = renderHook(() => useEmojiHunt());

    expect(Array.isArray(result.current.results)).toBe(true);
    expect(result.current.results.length).toBe(0);
  });

  it('should set lastAnswerCorrect after click', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.lastAnswerCorrect).toBe(null);

    act(() => {
      result.current.handleCellClick(0);
    });

    expect(result.current.lastAnswerCorrect).not.toBe(null);
    expect(typeof result.current.lastAnswerCorrect).toBe('boolean');
  });

  it('should have exactly one target emoji in the grid', () => {
    const { result } = renderHook(() => useEmojiHunt());

    act(() => {
      result.current.startGame();
    });

    const targetCount = result.current.grid.filter(
      emoji => emoji === result.current.targetEmoji
    ).length;

    expect(targetCount).toBe(1);
  });
});

