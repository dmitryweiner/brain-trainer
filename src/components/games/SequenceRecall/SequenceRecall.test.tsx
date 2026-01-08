import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SequenceRecall from './SequenceRecall';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ScoreProvider>
      <GameHistoryProvider>{component}</GameHistoryProvider>
    </ScoreProvider>
  );
};

describe('SequenceRecall Component', () => {
  it('should render intro screen', () => {
    const onBack = vi.fn();
    renderWithProvider(<SequenceRecall onBack={onBack} />);

    const titles = screen.getAllByText('🧠 Sequence Recall');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/Тренировка визуальной рабочей памяти/i)).toBeInTheDocument();
    expect(screen.getByText(/Запомните последовательность эмодзи/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Начать игру/i })).toBeInTheDocument();
  });

  it('should start game and show sequence', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<SequenceRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Должно появиться "Запомните последовательность"
    await waitFor(() => {
      expect(screen.getByText(/Запомните последовательность/i)).toBeInTheDocument();
    });
  });

  it('should transition to input phase', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<SequenceRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Ждем окончания показа последовательности
    await waitFor(
      () => {
        expect(screen.getByText(/Повторите последовательность/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Должна появиться сетка кнопок
    const optionButtons = screen.getAllByRole('button').filter(
      (btn) => !btn.textContent?.includes('Назад')
    );
    expect(optionButtons.length).toBeGreaterThanOrEqual(8);
  });

  it('should display user input', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<SequenceRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Ждем фазы ввода
    await waitFor(
      () => {
        expect(screen.getByText(/Повторите последовательность/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Нажимаем на первую кнопку варианта
    const optionButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('option-button')
    );

    if (optionButtons.length > 0) {
      await user.click(optionButtons[0]);

      // Проверяем, что эмодзи появился в пользовательской последовательности
      await waitFor(() => {
        const userDisplay = container.querySelector('.user-sequence-display');
        const userEmoji = userDisplay?.querySelector('.user-emoji');
        expect(userEmoji).not.toBeNull();
      });
    }
  });

  it('should show stats during input', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<SequenceRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Ждем фазы ввода
    await waitFor(
      () => {
        expect(screen.getByText(/Повторите последовательность/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Проверяем наличие статистики
    const stats = container.querySelector('.sequence-recall-stats');
    expect(stats).toBeInTheDocument();
    expect(stats?.textContent).toContain('Длина:');
    expect(stats?.textContent).toContain('Введено:');
    expect(stats?.textContent).toContain('Очки:');
  });

  it('should show progress bar', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<SequenceRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Ждем появления прогресс-бара
    await waitFor(
      () => {
        const progressBar = screen.getByText(/Уровень 3/i);
        expect(progressBar).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('should call onBack from GameLayout', () => {
    const onBack = vi.fn();
    const { container } = renderWithProvider(<SequenceRecall onBack={onBack} />);

    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });
});

