import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMemoryFlip } from './useMemoryFlip';

describe('useMemoryFlip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with intro status', () => {
    const { result } = renderHook(() => useMemoryFlip());

    expect(result.current.status).toBe('intro');
    expect(result.current.level).toBe(1);
    expect(result.current.cards).toEqual([]);
    expect(result.current.moves).toBe(0);
    expect(result.current.totalScore).toBe(0);
    expect(result.current.levelStats).toEqual([]);
  });

  it('should start game with level 1 cards', () => {
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.level).toBe(1);
    expect(result.current.cards).toHaveLength(6); // 2x3 grid
    expect(result.current.moves).toBe(0);
    expect(result.current.levelStats).toEqual([]);
  });

  it('should generate cards with pairs', () => {
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    const emojis = result.current.cards.map((card) => card.emoji);
    const uniqueEmojis = Array.from(new Set(emojis));

    // Должно быть 3 уникальных эмодзи (3 пары)
    expect(uniqueEmojis).toHaveLength(3);

    // Каждый эмодзи должен встречаться ровно 2 раза
    uniqueEmojis.forEach((emoji) => {
      const count = emojis.filter((e) => e === emoji).length;
      expect(count).toBe(2);
    });
  });

  it('should flip card on click', () => {
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    const firstCard = result.current.cards[0];
    expect(firstCard.isFlipped).toBe(false);

    act(() => {
      result.current.handleCardClick(0);
    });

    expect(result.current.cards[0].isFlipped).toBe(true);
    expect(result.current.flippedCards).toHaveLength(1);
  });

  it('should match two identical cards', () => {
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    // Найдем индексы двух карт с одинаковым эмодзи
    const cards = result.current.cards;
    const firstEmoji = cards[0].emoji;
    const firstIndex = 0;
    const secondIndex = cards.findIndex((card, idx) => idx !== 0 && card.emoji === firstEmoji);

    // Открываем первую карту
    act(() => {
      result.current.handleCardClick(firstIndex);
    });

    // Открываем вторую карту
    act(() => {
      result.current.handleCardClick(secondIndex);
    });

    expect(result.current.cards[firstIndex].isMatched).toBe(true);
    expect(result.current.cards[secondIndex].isMatched).toBe(true);
    expect(result.current.moves).toBe(1);
  });

  it('should complete level 1 when all pairs found', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    const cards = result.current.cards;
    const uniqueEmojis = Array.from(new Set(cards.map((c) => c.emoji)));

    // Открываем все пары
    for (const emoji of uniqueEmojis) {
      const indices = cards
        .map((card, idx) => ({ emoji: card.emoji, idx }))
        .filter((item) => item.emoji === emoji)
        .map((item) => item.idx);

      await act(async () => {
        result.current.handleCardClick(indices[0]);
      });
      
      await act(async () => {
        result.current.handleCardClick(indices[1]);
      });
    }

    await waitFor(() => {
      expect(result.current.status).toBe('level-complete');
    });
    
    expect(result.current.levelStats).toHaveLength(1);
    expect(result.current.levelStats[0].moves).toBeGreaterThan(0);
    expect(result.current.levelStats[0].score).toBeGreaterThan(0);
    vi.useFakeTimers();
  });

  it('should proceed to next level', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    // Завершаем уровень 1
    const cards = result.current.cards;
    const uniqueEmojis = Array.from(new Set(cards.map((c) => c.emoji)));

    for (const emoji of uniqueEmojis) {
      const indices = cards
        .map((card, idx) => ({ emoji: card.emoji, idx }))
        .filter((item) => item.emoji === emoji)
        .map((item) => item.idx);

      await act(async () => {
        result.current.handleCardClick(indices[0]);
      });
      
      await act(async () => {
        result.current.handleCardClick(indices[1]);
      });
    }

    await waitFor(() => {
      expect(result.current.status).toBe('level-complete');
    });

    // Переходим на уровень 2
    act(() => {
      result.current.proceedToNextLevel();
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.level).toBe(2);
    expect(result.current.cards).toHaveLength(12); // 3x4 grid
    expect(result.current.moves).toBe(0); // Счетчик ходов сбрасывается
    vi.useFakeTimers();
  });

  it('should calculate score correctly', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    const cards = result.current.cards;
    const uniqueEmojis = Array.from(new Set(cards.map((c) => c.emoji)));

    for (const emoji of uniqueEmojis) {
      const indices = cards
        .map((card, idx) => ({ emoji: card.emoji, idx }))
        .filter((item) => item.emoji === emoji)
        .map((item) => item.idx);

      await act(async () => {
        result.current.handleCardClick(indices[0]);
      });
      
      await act(async () => {
        result.current.handleCardClick(indices[1]);
      });
    }

    await waitFor(() => {
      expect(result.current.status).toBe('level-complete');
    });

    // Базовый балл 10, минус 1 за каждый лишний ход сверх 5
    const moves = result.current.levelStats[0].moves;
    const expectedScore = Math.max(0, 10 - Math.max(0, moves - 5));
    expect(result.current.levelStats[0].score).toBe(expectedScore);
    vi.useFakeTimers();
  });

  it('should update elapsed time', () => {
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.elapsedTime).toBe(0);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedTime).toBe(5);
  });

  it('should finish game after all levels completion', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useMemoryFlip());

    act(() => {
      result.current.startGame();
    });

    // Проходим все 4 уровня
    for (let lvl = 0; lvl < 4; lvl++) {
      const cards = result.current.cards;
      const uniqueEmojis = Array.from(new Set(cards.map((c) => c.emoji)));

      for (const emoji of uniqueEmojis) {
        const indices = cards
          .map((card, idx) => ({ emoji: card.emoji, idx }))
          .filter((item) => item.emoji === emoji)
          .map((item) => item.idx);

        await act(async () => {
          result.current.handleCardClick(indices[0]);
        });
        
        await act(async () => {
          result.current.handleCardClick(indices[1]);
        });
      }

      if (lvl < 3) {
        await waitFor(() => {
          expect(result.current.status).toBe('level-complete');
        });

        act(() => {
          result.current.proceedToNextLevel();
        });
      }
    }

    await waitFor(() => {
      expect(result.current.status).toBe('results');
    });
    
    expect(result.current.levelStats).toHaveLength(4);
    expect(result.current.totalScore).toBeGreaterThan(0);
    vi.useFakeTimers();
  });
});
