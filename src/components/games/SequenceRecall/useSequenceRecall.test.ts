import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSequenceRecall } from './useSequenceRecall';

describe('useSequenceRecall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with intro status', () => {
    const { result } = renderHook(() => useSequenceRecall());

    expect(result.current.status).toBe('intro');
    expect(result.current.sequence).toEqual([]);
    expect(result.current.userSequence).toEqual([]);
    expect(result.current.currentLength).toBe(3);
    expect(result.current.totalScore).toBe(0);
    expect(result.current.correctSequences).toBe(0);
  });

  it('should start game with sequence of length 3', () => {
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('showing');
    expect(result.current.sequence).toHaveLength(3);
    expect(result.current.options).toHaveLength(8);
    expect(result.current.currentLength).toBe(3);
  });

  it('should generate 8 unique options', () => {
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    const uniqueOptions = new Set(result.current.options);
    expect(uniqueOptions.size).toBe(8);
  });

  it('should include all sequence emojis in options', () => {
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    const optionsSet = new Set(result.current.options);
    result.current.sequence.forEach((emoji) => {
      expect(optionsSet.has(emoji)).toBe(true);
    });
  });

  it('should show emojis one by one', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('showing');

    // Ждем окончания показа последовательности (3 эмодзи * (800ms + 200ms) = 3000ms)
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 4000 }
    );

    vi.useFakeTimers();
  });

  it('should accept correct answer', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    // Ждем перехода в фазу ввода
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 5000 }
    );

    const firstEmoji = result.current.sequence[0];

    act(() => {
      result.current.handleOptionClick(firstEmoji);
    });

    expect(result.current.userSequence).toContain(firstEmoji);
    vi.useFakeTimers();
  });

  it('should handle complete correct sequence', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    // Ждем перехода в фазу ввода
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 5000 }
    );

    const sequence = result.current.sequence;

    // Воспроизводим всю последовательность
    for (const emoji of sequence) {
      await act(async () => {
        result.current.handleOptionClick(emoji);
      });
    }

    await waitFor(() => {
      expect(result.current.status).toBe('feedback');
    });
    
    expect(result.current.lastAnswerCorrect).toBe(true);
    vi.useFakeTimers();
  });

  it('should increase score on correct sequence', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    // Ждем перехода в фазу ввода
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 5000 }
    );

    const initialScore = result.current.totalScore;
    const sequence = result.current.sequence;

    // Воспроизводим всю последовательность
    for (const emoji of sequence) {
      await act(async () => {
        result.current.handleOptionClick(emoji);
      });
    }

    await waitFor(() => {
      expect(result.current.totalScore).toBe(initialScore + 3);
    });
    
    vi.useFakeTimers();
  });

  it('should continue game with same length on incorrect answer', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    // Ждем перехода в фазу ввода
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 5000 }
    );

    const sequence = result.current.sequence;
    const initialLength = result.current.currentLength;
    // Находим эмодзи, которого НЕТ в последовательности на первой позиции
    const wrongEmoji = result.current.options.find((opt) => opt !== sequence[0]);

    await act(async () => {
      result.current.handleOptionClick(wrongEmoji!);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('feedback');
    });
    
    expect(result.current.lastAnswerCorrect).toBe(false);

    // Ждем перехода к showing (новая последовательность с той же длиной)
    await waitFor(
      () => {
        expect(result.current.status).toBe('showing');
      },
      { timeout: 2000 }
    );
    
    // Проверяем, что длина осталась той же
    expect(result.current.currentLength).toBe(initialLength);
    
    vi.useFakeTimers();
  });

  it('should increase sequence length after correct answer', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    // Ждем перехода в фазу ввода
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 5000 }
    );

    const sequence = result.current.sequence;
    expect(result.current.currentLength).toBe(3);

    // Воспроизводим всю последовательность
    for (const emoji of sequence) {
      await act(async () => {
        result.current.handleOptionClick(emoji);
      });
    }

    // Ждем перехода к следующему уровню (feedback + showing)
    await waitFor(
      () => {
        expect(result.current.currentLength).toBe(4);
      },
      { timeout: 3000 }
    );

    await waitFor(() => {
      expect(result.current.sequence).toHaveLength(4);
    });
    
    vi.useFakeTimers();
  });

  it('should track correct sequences count', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    // Ждем фазы ввода
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 5000 }
    );

    const sequence = result.current.sequence;

    // Воспроизводим последовательность
    for (const emoji of sequence) {
      await act(async () => {
        result.current.handleOptionClick(emoji);
      });
    }

    await waitFor(() => {
      expect(result.current.correctSequences).toBe(1);
    });
    
    vi.useFakeTimers();
  });

  it('should reset state on new game', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSequenceRecall());

    act(() => {
      result.current.startGame();
    });

    // Ждем фазы ввода
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 5000 }
    );

    const sequence = result.current.sequence;
    for (const emoji of sequence) {
      await act(async () => {
        result.current.handleOptionClick(emoji);
      });
    }

    // Начинаем новую игру
    act(() => {
      result.current.startGame();
    });

    expect(result.current.totalScore).toBe(0);
    expect(result.current.correctSequences).toBe(0);
    expect(result.current.currentLength).toBe(3);
    expect(result.current.userSequence).toEqual([]);
    vi.useFakeTimers();
  });
});

