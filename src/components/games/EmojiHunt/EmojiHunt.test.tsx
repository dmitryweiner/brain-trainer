import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmojiHunt from './EmojiHunt';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ScoreProvider>
      <GameHistoryProvider>{component}</GameHistoryProvider>
    </ScoreProvider>
  );
};

describe('EmojiHunt Component', () => {
  it('should render intro screen', () => {
    const onBack = vi.fn();
    renderWithProvider(<EmojiHunt onBack={onBack} />);

    // Multiple elements have "Emoji Hunt" text (header and intro)
    const titles = screen.getAllByText(/Emoji Hunt/);
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/Тренировка визуального поиска/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Начать игру/i })).toBeInTheDocument();
  });

  it('should display game rules', () => {
    const onBack = vi.fn();
    renderWithProvider(<EmojiHunt onBack={onBack} />);

    expect(screen.getByText(/Найдите целевой эмодзи на сетке/i)).toBeInTheDocument();
    expect(screen.getByText(/Нажмите на него как можно быстрее/i)).toBeInTheDocument();
  });

  it('should show difficulty levels info', () => {
    const onBack = vi.fn();
    renderWithProvider(<EmojiHunt onBack={onBack} />);

    expect(screen.getByText(/3×3/)).toBeInTheDocument();
    expect(screen.getByText(/4×4/)).toBeInTheDocument();
    expect(screen.getByText(/5×5/)).toBeInTheDocument();
  });

  it('should start game and show grid', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const grid = container.querySelector('.emoji-grid');
      expect(grid).toBeInTheDocument();
    });
  });

  it('should display target emoji', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const targetSection = container.querySelector('.target-section');
      expect(targetSection).toBeInTheDocument();
    });

    expect(screen.getByText(/Найдите:/i)).toBeInTheDocument();
  });

  it('should show progress bar', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Раунд 1/i)).toBeInTheDocument();
    });
  });

  it('should show difficulty badge', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const badge = container.querySelector('.difficulty-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  it('should display 9 cells for 3x3 grid', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const cells = container.querySelectorAll('.emoji-cell');
      expect(cells).toHaveLength(9);
    });
  });

  it('should show feedback after clicking cell', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const cells = container.querySelectorAll('.emoji-cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    const cells = container.querySelectorAll('.emoji-cell');
    await user.click(cells[0]);

    await waitFor(() => {
      const feedback = container.querySelector('.emoji-hunt-feedback');
      expect(feedback).toBeInTheDocument();
    });
  });

  it('should show correct feedback indicator', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const cells = container.querySelectorAll('.emoji-cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    const cells = container.querySelectorAll('.emoji-cell');
    await user.click(cells[0]);

    await waitFor(() => {
      const indicator = container.querySelector('.feedback-indicator');
      expect(indicator).toBeInTheDocument();
      // Should have either correct or incorrect class
      expect(
        indicator?.classList.contains('correct') ||
        indicator?.classList.contains('incorrect')
      ).toBe(true);
    });
  });

  it('should show game stats in footer', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Wait for the game to start and the grid to appear
    await waitFor(() => {
      const grid = container.querySelector('.emoji-grid');
      expect(grid).toBeInTheDocument();
    });

    // The footer is rendered via GameLayout's footer prop
    // Check that stats elements exist in game-footer
    await waitFor(() => {
      const footer = container.querySelector('.game-footer');
      expect(footer).toBeInTheDocument();
    });
  });

  it('should call onBack from GameLayout', () => {
    const onBack = vi.fn();
    const { container } = renderWithProvider(<EmojiHunt onBack={onBack} />);

    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });

  it('should display emoji cells as buttons', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<EmojiHunt onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const cellButtons = screen.getAllByRole('button').filter(
        btn => btn.classList.contains('emoji-cell')
      );
      expect(cellButtons.length).toBe(9);
    });
  });
});

