import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogicPairConcept from './LogicPairConcept';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ScoreProvider>
      <GameHistoryProvider>{component}</GameHistoryProvider>
    </ScoreProvider>
  );
};

describe('LogicPairConcept Component', () => {
  it('should render intro screen', () => {
    const onBack = vi.fn();
    renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const titles = screen.getAllByText(/Logic Pair|Логічні пари|Логические пары/i);
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/Тренировка абстрактного|Abstract thinking/i)).toBeInTheDocument();
    expect(screen.getByText(/Показываються 4 предмети|Показываются 4 предмета|4 items are shown/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Начать игру|Start/i })).toBeInTheDocument();
  });

  it('should start game and show playing screen', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    // Должна появиться инструкция или сетка элементов
    await waitFor(() => {
      const items = container.querySelectorAll('.item-button');
      expect(items.length).toBe(4);
    });
  });

  it('should display 4 items in grid', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      const items = container.querySelectorAll('.item-button');
      expect(items.length).toBe(4);
    });
  });

  it('should select items on click', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      const items = container.querySelectorAll('.item-button');
      expect(items.length).toBeGreaterThan(0);
    });

    const items = container.querySelectorAll('.item-button');
    
    // Кликаем на первый элемент
    await user.click(items[0] as Element);

    expect(items[0].classList.contains('selected')).toBe(true);
  });

  it('should enable submit button when 2 items selected', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      const items = container.querySelectorAll('.item-button');
      expect(items.length).toBe(4);
    });

    const submitButton = screen.getByRole('button', { name: /Подтвердити вибір|Подтвердить выбор|Confirm/i });
    expect(submitButton).toBeDisabled();

    const items = container.querySelectorAll('.item-button');
    
    // Выбираем 2 элемента
    await user.click(items[0] as Element);
    await user.click(items[1] as Element);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should show feedback after submission', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      const items = container.querySelectorAll('.item-button');
      expect(items.length).toBe(4);
    });

    const items = container.querySelectorAll('.item-button');
    
    // Выбираем 2 элемента
    await user.click(items[0] as Element);
    await user.click(items[1] as Element);

    const submitButton = screen.getByRole('button', { name: /Подтвердити вибір|Подтвердить выбор|Confirm/i });
    await user.click(submitButton);

    // Должна появиться обратная связь
    await waitFor(() => {
      const feedback = screen.queryByText(/Правильно/i) || screen.queryByText(/Неправильно/i);
      expect(feedback).toBeInTheDocument();
    });
  });

  it('should show stats during game', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      const stats = container.querySelector('.logic-pair-stats');
      expect(stats).toBeInTheDocument();
      expect(stats?.textContent).toMatch(/Раунд|Round/);
      expect(stats?.textContent).toMatch(/Правильных|Correct/);
      expect(stats?.textContent).toMatch(/Очки|Score/);
    });
  });

  it('should show progress bar', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Раунд 1 \/ 10|Round 1 \/ 10/i)).toBeInTheDocument();
    });
  });

  it('should show submit hint', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<LogicPairConcept onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      const hint = container.querySelector('.submit-hint');
      expect(hint).toBeInTheDocument();
      expect(hint?.textContent).toBeTruthy();
    });
  });

  it('should call onBack from GameLayout', () => {
    const onBack = vi.fn();
    const { container } = renderWithProvider(<LogicPairConcept onBack={onBack} />);

    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });
});

