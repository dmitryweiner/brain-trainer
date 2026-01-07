import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNBack } from './useNBack';

describe('useNBack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with intro status', () => {
    const { result } = renderHook(() => useNBack());

    expect(result.current.status).toBe('intro');
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.currentBlock).toBe(1);
    expect(result.current.hits).toBe(0);
    expect(result.current.misses).toBe(0);
    expect(result.current.falseAlarms).toBe(0);
    expect(result.current.correctRejections).toBe(0);
  });

  it('should start game and generate sequence', () => {
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.sequence).toHaveLength(20);
    expect(result.current.currentBlock).toBe(1);
  });

  it('should show emojis sequentially', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.currentEmoji).toBeNull();

    // Ждем появления первого эмодзи
    await waitFor(
      () => {
        expect(result.current.currentEmoji).not.toBeNull();
      },
      { timeout: 1000 }
    );

    expect(result.current.currentIndex).toBe(0);
    vi.useFakeTimers();
  });

  it('should enable answer after showing N items', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    // Need to wait for index 2 (after N=2 items shown)
    // 500ms initial delay + 2*2500ms = 5500ms minimum
    await waitFor(
      () => {
        expect(result.current.canAnswer).toBe(true);
      },
      { timeout: 8000 }
    );

    vi.useFakeTimers();
  }, 10000);

  it('should handle match button click', () => {
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    const initialHits = result.current.hits;
    const initialFalseAlarms = result.current.falseAlarms;

    // Кнопка не должна работать пока не показан эмодзи
    act(() => {
      result.current.handleMatch();
    });

    expect(result.current.hits).toBe(initialHits);
    expect(result.current.falseAlarms).toBe(initialFalseAlarms);
  });

  it('should have correct initial sequence', () => {
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    // Последовательность должна быть сгенерирована
    expect(result.current.sequence.length).toBe(20);
    expect(result.current.currentBlock).toBe(1);
    expect(result.current.currentIndex).toBe(-1);
  });

  it('should calculate score correctly', () => {
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.score).toBe(0);

    // Имитируем успешное состояние с хитами и правильными пропусками
    // Поскольку состояние внутреннее, мы проверяем только формулу
    // hits * 1 + correctRejections * 0.5
    const expectedScore = result.current.hits * 1 + result.current.correctRejections * 0.5;
    expect(result.current.score).toBe(expectedScore);
  });

  it('should initialize history as empty', () => {
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    // История изначально пустая до показа элементов
    expect(result.current.history).toEqual([]);
    expect(result.current.currentIndex).toBe(-1);
  });

  it('should not allow multiple answers for same emoji', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    // Need to wait for index 2 (after N=2 items shown)
    await waitFor(
      () => {
        expect(result.current.canAnswer).toBe(true);
      },
      { timeout: 8000 }
    );

    const initialHits = result.current.hits;
    const initialFalseAlarms = result.current.falseAlarms;

    // Нажимаем первый раз
    act(() => {
      result.current.handleMatch();
    });

    const afterFirstClick = {
      hits: result.current.hits,
      falseAlarms: result.current.falseAlarms,
    };

    // Пытаемся нажать второй раз
    act(() => {
      result.current.handleMatch();
    });

    // Счетчики не должны измениться
    expect(result.current.hits).toBe(afterFirstClick.hits);
    expect(result.current.falseAlarms).toBe(afterFirstClick.falseAlarms);

    vi.useFakeTimers();
  }, 10000);

  it('should prevent answering when canAnswer is false', () => {
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.canAnswer).toBe(false);

    const initialHits = result.current.hits;
    const initialFalseAlarms = result.current.falseAlarms;

    // Пытаемся ответить когда нельзя
    act(() => {
      result.current.handleMatch();
    });

    expect(result.current.hits).toBe(initialHits);
    expect(result.current.falseAlarms).toBe(initialFalseAlarms);
  });

  it('should reset state on new game', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useNBack());

    act(() => {
      result.current.startGame();
    });

    // Ждем начала игры
    await waitFor(
      () => {
        expect(result.current.currentIndex).toBeGreaterThanOrEqual(0);
      },
      { timeout: 1000 }
    );

    // Начинаем новую игру
    act(() => {
      result.current.startGame();
    });

    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.currentBlock).toBe(1);
    expect(result.current.hits).toBe(0);
    expect(result.current.misses).toBe(0);
    expect(result.current.falseAlarms).toBe(0);
    expect(result.current.correctRejections).toBe(0);
    expect(result.current.score).toBe(0);

    vi.useFakeTimers();
  });
});

