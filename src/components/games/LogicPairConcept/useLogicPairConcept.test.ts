import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogicPairConcept } from './useLogicPairConcept';

describe('useLogicPairConcept', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with intro status', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    expect(result.current.status).toBe('intro');
    expect(result.current.currentRound).toBe(1);
    expect(result.current.selectedItems).toEqual([]);
    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.score).toBe(0);
  });

  it('should start game', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.currentRound).toBe(1);
    expect(result.current.items).toHaveLength(4);
  });

  it('should select items on click', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    // Выбираем первый элемент
    act(() => {
      result.current.handleItemClick(0);
    });

    expect(result.current.selectedItems).toEqual([0]);
    expect(result.current.canSubmit).toBe(false);

    // Выбираем второй элемент
    act(() => {
      result.current.handleItemClick(1);
    });

    expect(result.current.selectedItems).toEqual([0, 1]);
    expect(result.current.canSubmit).toBe(true);
  });

  it('should deselect item on second click', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    // Выбираем элемент
    act(() => {
      result.current.handleItemClick(0);
    });

    expect(result.current.selectedItems).toEqual([0]);

    // Кликаем на него снова
    act(() => {
      result.current.handleItemClick(0);
    });

    expect(result.current.selectedItems).toEqual([]);
  });

  it('should not allow selecting more than 2 items', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.handleItemClick(0);
      result.current.handleItemClick(1);
      result.current.handleItemClick(2); // Третий элемент не должен добавиться
    });

    expect(result.current.selectedItems).toEqual([0, 1]);
    expect(result.current.selectedItems.length).toBe(2);
  });

  it('should handle correct answer submission', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    // Выбираем правильную пару (0 и 1 - фрукты в первом раунде)
    act(() => {
      result.current.handleItemClick(0);
      result.current.handleItemClick(1);
    });

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.status).toBe('feedback');
    expect(result.current.lastAnswerCorrect).toBe(true);
    expect(result.current.correctAnswers).toBe(1);
    expect(result.current.score).toBe(2);
  });

  it('should handle incorrect answer submission', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    // Выбираем неправильную пару (0 и 2 - яблоко и собака)
    act(() => {
      result.current.handleItemClick(0);
      result.current.handleItemClick(2);
    });

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.status).toBe('feedback');
    expect(result.current.lastAnswerCorrect).toBe(false);
    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.score).toBe(0);
  });

  it('should not submit if less than 2 items selected', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.handleItemClick(0);
    });

    const initialStatus = result.current.status;

    act(() => {
      result.current.handleSubmit();
    });

    // Статус не должен измениться
    expect(result.current.status).toBe(initialStatus);
  });

  it('should proceed to next round after feedback', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    // Отвечаем на первый раунд
    act(() => {
      result.current.handleItemClick(0);
      result.current.handleItemClick(1);
      result.current.handleSubmit();
    });

    expect(result.current.currentRound).toBe(1);

    // Продолжаем
    act(() => {
      result.current.handleContinue();
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.currentRound).toBe(2);
    expect(result.current.selectedItems).toEqual([]);
    expect(result.current.lastAnswerCorrect).toBeNull();
  });

  it('should finish game after 10 rounds', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    // Проходим 10 раундов
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.handleItemClick(0);
        result.current.handleItemClick(1);
        result.current.handleSubmit();
      });

      if (i < 9) {
        act(() => {
          result.current.handleContinue();
        });
        expect(result.current.status).toBe('playing');
      }
    }

    // После 10-го раунда переходим к результатам
    act(() => {
      result.current.handleContinue();
    });

    expect(result.current.status).toBe('results');
  });

  it('should track correct answers', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.correctAnswers).toBe(0);

    // Выбираем пару (0 и 1 - фрукты в первом раунде)
    act(() => {
      result.current.handleItemClick(0);
    });
    
    act(() => {
      result.current.handleItemClick(1);
    });
    
    expect(result.current.canSubmit).toBe(true);
    
    // Отправляем ответ
    act(() => {
      result.current.handleSubmit();
    });

    // lastAnswerCorrect должен быть установлен
    expect(result.current.lastAnswerCorrect).not.toBeNull();
  });

  it('should reset state on new game', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    act(() => {
      result.current.startGame();
    });

    // Выбираем элементы
    act(() => {
      result.current.handleItemClick(0);
      result.current.handleItemClick(1);
    });

    expect(result.current.selectedItems.length).toBe(2);

    // Начинаем новую игру
    act(() => {
      result.current.startGame();
    });

    // Все должно сброситься
    expect(result.current.status).toBe('playing');
    expect(result.current.currentRound).toBe(1);
    expect(result.current.selectedItems).toEqual([]);
    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.score).toBe(0);
    expect(result.current.lastAnswerCorrect).toBeNull();
  });

  it('should not allow item selection in non-playing status', () => {
    const { result } = renderHook(() => useLogicPairConcept());

    // Пытаемся выбрать элемент в intro
    act(() => {
      result.current.handleItemClick(0);
    });

    expect(result.current.selectedItems).toEqual([]);
  });
});

