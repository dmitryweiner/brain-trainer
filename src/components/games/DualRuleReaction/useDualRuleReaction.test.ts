import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDualRuleReaction } from './useDualRuleReaction';

describe('useDualRuleReaction', () => {
  beforeEach(() => {
    // Используем реальные таймеры для этих тестов
    vi.useRealTimers();
  });

  it('should initialize with intro status', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    expect(result.current.status).toBe('intro');
    expect(result.current.currentRound).toBe(1);
    expect(result.current.score).toBe(0);
    expect(result.current.errors).toBe(0);
  });

  it('should start game', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.currentRound).toBe(1);
    expect(result.current.currentRule).toBe('shape');
    expect(['circle', 'square']).toContain(result.current.shape);
    expect(['green', 'red']).toContain(result.current.color);
  });

  it('should show rule hint only in first round', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.showRuleHint).toBe(true);
    expect(result.current.currentRound).toBe(1);
  });

  it('should handle correct answer in shape rule', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    const { shape } = result.current;
    const correctAnswer = shape === 'circle' ? 'A' : 'B';

    act(() => {
      result.current.handleAnswer(correctAnswer);
    });

    expect(result.current.status).toBe('feedback');
    expect(result.current.lastAnswerCorrect).toBe(true);
    expect(result.current.score).toBe(1);
    expect(result.current.errors).toBe(0);
  });

  it('should handle incorrect answer', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    const { shape } = result.current;
    const incorrectAnswer = shape === 'circle' ? 'B' : 'A';

    act(() => {
      result.current.handleAnswer(incorrectAnswer);
    });

    expect(result.current.status).toBe('feedback');
    expect(result.current.lastAnswerCorrect).toBe(false);
    expect(result.current.score).toBe(0); // 0 - 0.5 = -0.5, но Math.max(0, -0.5) = 0
    expect(result.current.errors).toBe(1);
  });

  it('should penalize incorrect answers with -0.5', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    // Набираем 2 очка
    for (let i = 0; i < 2; i++) {
      const { shape } = result.current;
      const correctAnswer = shape === 'circle' ? 'A' : 'B';

      act(() => {
        result.current.handleAnswer(correctAnswer);
      });

      act(() => {
        result.current.proceedToNextRound();
      });
    }

    expect(result.current.score).toBe(2);

    // Делаем ошибку
    const { shape } = result.current;
    const incorrectAnswer = shape === 'circle' ? 'B' : 'A';

    act(() => {
      result.current.handleAnswer(incorrectAnswer);
    });

    expect(result.current.score).toBe(1.5); // 2 - 0.5 = 1.5
  });

  it('should track reaction times', async () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    // Добавляем небольшую задержку для имитации реального времени реакции
    await new Promise((resolve) => setTimeout(resolve, 10));

    const { shape } = result.current;
    const correctAnswer = shape === 'circle' ? 'A' : 'B';

    act(() => {
      result.current.handleAnswer(correctAnswer);
    });

    expect(result.current.reactionTimes).toHaveLength(1);
    expect(result.current.reactionTimes[0]).toBeGreaterThanOrEqual(0);
  });

  it('should proceed to next round', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.currentRound).toBe(1);

    const { shape } = result.current;
    const correctAnswer = shape === 'circle' ? 'A' : 'B';

    act(() => {
      result.current.handleAnswer(correctAnswer);
    });

    act(() => {
      result.current.proceedToNextRound();
    });

    expect(result.current.currentRound).toBe(2);
    expect(result.current.status).toBe('playing');
    expect(result.current.lastAnswerCorrect).toBeNull();
  });

  it('should switch rule at round 16', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    // Проходим 15 раундов
    for (let i = 1; i < 16; i++) {
      expect(result.current.currentRule).toBe('shape');

      const { shape } = result.current;
      const correctAnswer = shape === 'circle' ? 'A' : 'B';

      act(() => {
        result.current.handleAnswer(correctAnswer);
      });

      act(() => {
        result.current.proceedToNextRound();
      });
    }

    // На 16 раунде правило должно смениться на 'color'
    expect(result.current.currentRound).toBe(16);
    expect(result.current.currentRule).toBe('color');
  });

  it('should use color rule correctly from round 16', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    // Быстро проходим до 16 раунда
    for (let i = 1; i < 16; i++) {
      const { shape } = result.current;
      const correctAnswer = shape === 'circle' ? 'A' : 'B';

      act(() => {
        result.current.handleAnswer(correctAnswer);
      });

      act(() => {
        result.current.proceedToNextRound();
      });
    }

    // Теперь мы на 16 раунде, правило по цвету
    expect(result.current.currentRule).toBe('color');

    const { color } = result.current;
    const correctAnswer = color === 'green' ? 'A' : 'B';

    act(() => {
      result.current.handleAnswer(correctAnswer);
    });

    expect(result.current.lastAnswerCorrect).toBe(true);
  });

  it('should end game after round 30', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    // Проходим все 30 раундов
    for (let i = 1; i <= 30; i++) {
      const { shape, color, currentRule } = result.current;
      
      const correctAnswer = currentRule === 'shape'
        ? (shape === 'circle' ? 'A' : 'B')
        : (color === 'green' ? 'A' : 'B');

      act(() => {
        result.current.handleAnswer(correctAnswer);
      });

      if (i < 30) {
        act(() => {
          result.current.proceedToNextRound();
        });
      }
    }

    expect(result.current.currentRound).toBe(30);

    // Переходим к следующему раунду, должна завершиться игра
    act(() => {
      result.current.proceedToNextRound();
    });

    expect(result.current.status).toBe('results');
  });

  it('should not hide rule hint after first round', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.showRuleHint).toBe(true);

    const { shape } = result.current;
    const correctAnswer = shape === 'circle' ? 'A' : 'B';

    act(() => {
      result.current.handleAnswer(correctAnswer);
    });

    act(() => {
      result.current.proceedToNextRound();
    });

    expect(result.current.showRuleHint).toBe(false);
    expect(result.current.currentRound).toBe(2);
  });

  it('should reset state on new game', () => {
    const { result } = renderHook(() => useDualRuleReaction());

    act(() => {
      result.current.startGame();
    });

    // Играем и набираем очки
    const { shape } = result.current;
    const correctAnswer = shape === 'circle' ? 'A' : 'B';

    act(() => {
      result.current.handleAnswer(correctAnswer);
    });

    expect(result.current.score).toBeGreaterThan(0);

    // Начинаем новую игру
    act(() => {
      result.current.startGame();
    });

    expect(result.current.score).toBe(0);
    expect(result.current.errors).toBe(0);
    expect(result.current.currentRound).toBe(1);
    expect(result.current.reactionTimes).toEqual([]);
    expect(result.current.lastAnswerCorrect).toBeNull();
  });
});

