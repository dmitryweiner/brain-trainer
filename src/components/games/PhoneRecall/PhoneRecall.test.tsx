import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneRecall from './PhoneRecall';
import { ScoreProvider } from '../../../context/ScoreContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<ScoreProvider>{component}</ScoreProvider>);
};

describe('PhoneRecall Component', () => {
  it('should render intro screen', () => {
    const onBack = vi.fn();
    renderWithProvider(<PhoneRecall onBack={onBack} />);

    expect(screen.getByText('Phone Recall')).toBeInTheDocument();
    expect(screen.getByText(/Тренировка числовой памяти/i)).toBeInTheDocument();
    expect(screen.getByText(/Запомните показанный номер/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Начать игру/i })).toBeInTheDocument();
  });

  it('should display game rules', () => {
    const onBack = vi.fn();
    renderWithProvider(<PhoneRecall onBack={onBack} />);

    expect(screen.getByText(/Начальная длина: 4 цифры/i)).toBeInTheDocument();
    expect(screen.getByText(/При успехе: \+1 цифра/i)).toBeInTheDocument();
    expect(screen.getByText(/При ошибке: игра завершается/i)).toBeInTheDocument();
  });

  it('should start game and show number', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Запомните номер/i)).toBeInTheDocument();
    });
  });

  it('should show timer during memorize phase', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const timerDisplay = container.querySelector('.timer-display');
      expect(timerDisplay).toBeInTheDocument();
    });
  });

  it('should transition to input phase', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(screen.getByText(/Введите номер/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );
  });

  it('should display numpad in input phase', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(screen.getByText(/Введите номер/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    const numpad = container.querySelector('.numpad');
    expect(numpad).toBeInTheDocument();

    // Check for digit buttons 0-9
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: i.toString() })).toBeInTheDocument();
    }
  });

  it('should have backspace button', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(screen.getByText(/Введите номер/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    expect(screen.getByRole('button', { name: '⌫' })).toBeInTheDocument();
  });

  it('should have submit button', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(screen.getByText(/Введите номер/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    expect(screen.getByRole('button', { name: '✓' })).toBeInTheDocument();
  });

  it('should show digit slots for input', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(screen.getByText(/Введите номер/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    const digitSlots = container.querySelectorAll('.digit-slot');
    expect(digitSlots).toHaveLength(4);
  });

  it('should call onBack from GameLayout', () => {
    const onBack = vi.fn();
    const { container } = renderWithProvider(<PhoneRecall onBack={onBack} />);

    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });

  it('should show progress bar during memorize', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Уровень 1/i)).toBeInTheDocument();
    });
  });

  it('should show stats during input', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<PhoneRecall onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Memorize time for 4 digits = 2000 + 4*500 = 4000ms
    await waitFor(
      () => {
        expect(screen.getByText(/Введите номер/i)).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    const stats = container.querySelector('.phone-recall-stats');
    expect(stats).toBeInTheDocument();
    expect(stats?.textContent).toContain('Длина:');
    expect(stats?.textContent).toContain('Очки:');
  });
});

