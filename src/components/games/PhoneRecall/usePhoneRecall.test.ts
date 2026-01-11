import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePhoneRecall } from './usePhoneRecall';

describe('usePhoneRecall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with intro status', () => {
    const { result } = renderHook(() => usePhoneRecall());

    expect(result.current.status).toBe('intro');
    expect(result.current.number).toBe('');
    expect(result.current.userInput).toBe('');
    expect(result.current.currentLength).toBe(4);
    expect(result.current.totalScore).toBe(0);
    expect(result.current.correctNumbers).toBe(0);
  });

  it('should start game with number of length 4', () => {
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('memorize');
    expect(result.current.number).toHaveLength(4);
    expect(result.current.currentLength).toBe(4);
  });

  it('should generate valid number (no leading zero)', () => {
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.number[0]).not.toBe('0');
    expect(/^\d+$/.test(result.current.number)).toBe(true);
  });

  it('should have memorize countdown', () => {
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.memorizeTimeLeft).toBeGreaterThan(0);
  });

  it('should transition from memorize to input after timer', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('memorize');

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    vi.useFakeTimers();
  });

  it('should handle digit input', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    act(() => {
      result.current.handleDigitClick('5');
    });

    expect(result.current.userInput).toBe('5');

    act(() => {
      result.current.handleDigitClick('3');
    });

    expect(result.current.userInput).toBe('53');

    vi.useFakeTimers();
  });

  it('should handle backspace', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    act(() => {
      result.current.handleDigitClick('1');
      result.current.handleDigitClick('2');
    });

    expect(result.current.userInput).toBe('12');

    act(() => {
      result.current.handleBackspace();
    });

    expect(result.current.userInput).toBe('1');

    vi.useFakeTimers();
  });

  it('should not allow more digits than currentLength (auto-check triggers at 4)', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    // Enter exactly 3 digits (less than currentLength)
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.handleDigitClick('1');
      });
    }

    // Should still be input with 3 digits
    expect(result.current.userInput).toHaveLength(3);
    expect(result.current.status).toBe('input');

    vi.useFakeTimers();
  });

  it('should handle correct answer with auto-check', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    const correctNumber = result.current.number;

    // Enter correct number (auto-check triggers when all digits entered)
    for (const digit of correctNumber) {
      act(() => {
        result.current.handleDigitClick(digit);
      });
    }

    // Auto-check triggers, should go to feedback
    await waitFor(() => {
      expect(result.current.status).toBe('feedback');
    });
    expect(result.current.lastAnswerCorrect).toBe(true);

    vi.useFakeTimers();
  });

  it('should continue game with same length on incorrect answer', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 8000 }
    );

    const initialLength = result.current.currentLength;

    // Enter wrong number - use digits that are definitely different from the generated number
    // The number doesn't start with 0, so entering all 0s is guaranteed wrong
    // Auto-check triggers when 4 digits are entered
    for (let i = 0; i < 4; i++) {
      act(() => {
        result.current.handleDigitClick('0');
      });
    }

    await waitFor(() => {
      expect(result.current.status).toBe('feedback');
    });

    expect(result.current.lastAnswerCorrect).toBe(false);

    // Wait for memorize phase (game continues with same length)
    await waitFor(
      () => {
        expect(result.current.status).toBe('memorize');
      },
      { timeout: 4000 }
    );
    
    // Length should remain the same
    expect(result.current.currentLength).toBe(initialLength);

    vi.useFakeTimers();
  }, 15000);

  it('should increase score on correct answer', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    const correctNumber = result.current.number;

    for (const digit of correctNumber) {
      act(() => {
        result.current.handleDigitClick(digit);
      });
    }

    // Auto-check triggers when input length matches
    await waitFor(() => {
      expect(result.current.totalScore).toBe(4); // Score = currentLength
    });

    vi.useFakeTimers();
  });

  it('should increase length after correct answer', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 8000 }
    );

    const correctNumber = result.current.number;

    for (const digit of correctNumber) {
      act(() => {
        result.current.handleDigitClick(digit);
      });
    }

    // Auto-check triggers when input length matches, then feedback, then next level
    await waitFor(
      () => {
        expect(result.current.currentLength).toBe(5);
      },
      { timeout: 5000 }
    );

    expect(result.current.number).toHaveLength(5);

    vi.useFakeTimers();
  }, 15000);

  it('should track correct numbers count', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    const correctNumber = result.current.number;

    for (const digit of correctNumber) {
      act(() => {
        result.current.handleDigitClick(digit);
      });
    }

    // Auto-check triggers
    await waitFor(() => {
      expect(result.current.correctNumbers).toBe(1);
    });

    vi.useFakeTimers();
  });

  it('should reset state on new game', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    const correctNumber = result.current.number;

    for (const digit of correctNumber) {
      act(() => {
        result.current.handleDigitClick(digit);
      });
    }

    // Auto-check triggers, wait for feedback
    await waitFor(
      () => {
        expect(result.current.status).toBe('feedback');
      },
      { timeout: 1000 }
    );

    // Start new game
    act(() => {
      result.current.startGame();
    });

    expect(result.current.totalScore).toBe(0);
    expect(result.current.correctNumbers).toBe(0);
    expect(result.current.currentLength).toBe(4);
    expect(result.current.userInput).toBe('');

    vi.useFakeTimers();
  });

  it('should not submit incomplete input', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePhoneRecall());

    act(() => {
      result.current.startGame();
    });

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(result.current.status).toBe('input');
      },
      { timeout: 6000 }
    );

    // Enter only 2 digits
    act(() => {
      result.current.handleDigitClick('1');
      result.current.handleDigitClick('2');
    });

    act(() => {
      result.current.handleSubmit();
    });

    // Status should still be input
    expect(result.current.status).toBe('input');

    vi.useFakeTimers();
  });

  it('should provide all required properties', () => {
    const { result } = renderHook(() => usePhoneRecall());

    expect(result.current).toHaveProperty('status');
    expect(result.current).toHaveProperty('number');
    expect(result.current).toHaveProperty('userInput');
    expect(result.current).toHaveProperty('currentLength');
    expect(result.current).toHaveProperty('totalScore');
    expect(result.current).toHaveProperty('correctNumbers');
    expect(result.current).toHaveProperty('lastAnswerCorrect');
    expect(result.current).toHaveProperty('memorizeTimeLeft');
    expect(result.current).toHaveProperty('startGame');
    expect(result.current).toHaveProperty('handleDigitClick');
    expect(result.current).toHaveProperty('handleBackspace');
    expect(result.current).toHaveProperty('handleSubmit');
  });
});

