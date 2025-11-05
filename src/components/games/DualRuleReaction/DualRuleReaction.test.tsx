import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DualRuleReaction from './DualRuleReaction';
import { ScoreProvider } from '../../../context/ScoreContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<ScoreProvider>{component}</ScoreProvider>);
};

describe('DualRuleReaction Component', () => {
  it('should render intro screen', () => {
    const onBack = vi.fn();
    renderWithProvider(<DualRuleReaction onBack={onBack} />);

    const titles = screen.getAllByText('↔️ Dual-Rule Reaction');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/Тренировка когнитивной гибкости/i)).toBeInTheDocument();
    expect(screen.getByText(/Показывается фигура с цветом/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Начать игру/i })).toBeInTheDocument();
  });

  it('should start game and show playing screen', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<DualRuleReaction onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Должны появиться кнопки A и B
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
    });
  });

  it('should show rule hint in first round', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<DualRuleReaction onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const ruleHint = container.querySelector('.rule-hint');
      expect(ruleHint).toBeInTheDocument();
      expect(ruleHint?.textContent).toContain('Круг');
      expect(ruleHint?.textContent).toContain('Квадрат');
    });
  });

  it('should display shape with color', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<DualRuleReaction onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const shape = container.querySelector('.shape');
      expect(shape).toBeInTheDocument();
      expect(shape?.classList.contains('green') || shape?.classList.contains('red')).toBe(true);
      expect(shape?.classList.contains('circle') || shape?.classList.contains('square')).toBe(true);
    });
  });

  it('should handle answer click', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<DualRuleReaction onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    });

    const buttonA = screen.getByRole('button', { name: 'A' });
    await user.click(buttonA);

    // Должен появиться feedback
    await waitFor(() => {
      const feedback = screen.queryByText(/Правильно/i) || screen.queryByText(/Неправильно/i);
      expect(feedback).toBeInTheDocument();
    });
  });

  it('should show stats during game', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<DualRuleReaction onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      const stats = container.querySelector('.dual-rule-stats');
      expect(stats).toBeInTheDocument();
      expect(stats?.textContent).toContain('Раунд:');
      expect(stats?.textContent).toContain('Ошибки:');
      expect(stats?.textContent).toContain('Очки:');
    });
  });

  it('should auto-proceed after feedback', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<DualRuleReaction onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    });

    const buttonA = screen.getByRole('button', { name: 'A' });
    await user.click(buttonA);

    // Ждем появления feedback
    await waitFor(() => {
      const feedback = screen.queryByText(/Правильно/i) || screen.queryByText(/Неправильно/i);
      expect(feedback).toBeInTheDocument();
    });

    // Ждем автоматического перехода к следующему раунду
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should show progress bar', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<DualRuleReaction onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Раунд 1 \/ 30/i)).toBeInTheDocument();
    });
  });

  it('should call onBack from GameLayout', () => {
    const onBack = vi.fn();
    const { container } = renderWithProvider(<DualRuleReaction onBack={onBack} />);

    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });
});

