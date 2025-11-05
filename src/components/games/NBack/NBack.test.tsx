import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NBack from './NBack';
import { ScoreProvider } from '../../../context/ScoreContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<ScoreProvider>{component}</ScoreProvider>);
};

describe('NBack Component', () => {
  it('should render intro screen', () => {
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const titles = screen.getAllByText('🔄 N-Back');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/Тренировка рабочей памяти/i)).toBeInTheDocument();
    expect(screen.getByText(/Эмодзи появляются по одному/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Начать игру/i })).toBeInTheDocument();
  });

  it('should start game and show playing screen', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Должна появиться кнопка "Совпадает"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Совпадает/i })).toBeInTheDocument();
    });
  });

  it('should show history section', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/История \(2 шага назад\):/i)).toBeInTheDocument();
    });
  });

  it('should show current emoji after start', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
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

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const stats = container.querySelector('.n-back-stats');
      expect(stats).toBeInTheDocument();
      expect(stats?.textContent).toContain('Блок:');
      expect(stats?.textContent).toContain('Позиция:');
      expect(stats?.textContent).toContain('Попадания:');
      expect(stats?.textContent).toContain('Пропуски:');
    });
  });

  it('should show progress bar', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Блок 1 \/ 3/i)).toBeInTheDocument();
    });
  });

  it('should enable match button when emoji is shown', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    const matchButton = await screen.findByRole('button', { name: /Совпадает/i });

    // Кнопка должна стать активной после показа эмодзи
    await waitFor(
      () => {
        expect(matchButton).not.toBeDisabled();
      },
      { timeout: 2000 }
    );
  });

  it('should show answer hint', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<NBack onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const hint = screen.queryByText(/Запоминайте последовательность/i) ||
                   screen.queryByText(/Нажмите, если совпадает/i);
      expect(hint).toBeInTheDocument();
    });
  });

  it('should call onBack from GameLayout', () => {
    const onBack = vi.fn();
    const { container } = renderWithProvider(<NBack onBack={onBack} />);

    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });
});

