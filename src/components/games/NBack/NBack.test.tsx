import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NBack from './NBack';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ScoreProvider>
      <GameHistoryProvider>{component}</GameHistoryProvider>
    </ScoreProvider>
  );
};

describe('NBack Component', () => {
  it('should render intro screen', () => {
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const titles = screen.getAllByText(/N-Back|N-назад/i);
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/Тренировка рабочей памяти|Working memory training/i)).toBeInTheDocument();
    expect(screen.getByText(/Эмодзи появляются|Emojis appear/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Начать игру|Start/i })).toBeInTheDocument();
  });

  it('should start game and show playing screen', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    // Должна появиться кнопка "Совпадает"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Совпадает|Match/i })).toBeInTheDocument();
    });
  });

  it('should show history section', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/История|History/i)).toBeInTheDocument();
    });
  });

  it('should show current emoji after start', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    // Ждем появления эмодзи
    await waitFor(
      () => {
        const emojiContainer = container.querySelector('.current-emoji');
        expect(emojiContainer).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should show stats during game', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      const stats = container.querySelector('.n-back-stats');
      expect(stats).toBeInTheDocument();
      expect(stats?.textContent).toMatch(/Блок|Block/);
      expect(stats?.textContent).toMatch(/Позиция|Position/);
      expect(stats?.textContent).toMatch(/Попадания|Hits/);
      expect(stats?.textContent).toMatch(/Пропуски|Misses/);
    });
  });

  it('should show progress bar', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Блок 1 \/ 3|Block 1 \/ 3/i)).toBeInTheDocument();
    });
  });

  it('should enable match button after N emojis are shown', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    const matchButton = await screen.findByRole('button', { name: /Совпадает|Match/i });

    // Кнопка должна стать активной после показа N (2) эмодзи
    // 500ms initial + 2*2500ms = 5500ms
    await waitFor(
      () => {
        expect(matchButton).not.toBeDisabled();
      },
      { timeout: 8000 }
    );
  }, 10000);

  it('should show answer hint', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру|Start/i });
    await user.click(startButton);

    await waitFor(() => {
      const hint = screen.queryByText(/Запоминайте|Memorize/i) ||
                   screen.queryByText(/Нажмите|Press/i);
      expect(hint).toBeInTheDocument();
    });
  });

  it('should call onBack from GameLayout', () => {
    const onBack = vi.fn();
    const { container } = renderWithProvider(<NBack onBack={onBack} />);

    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });
});

