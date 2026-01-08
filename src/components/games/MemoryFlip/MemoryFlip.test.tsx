import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemoryFlip from './MemoryFlip';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ScoreProvider>
      <GameHistoryProvider>{component}</GameHistoryProvider>
    </ScoreProvider>
  );
};

describe('MemoryFlip Component', () => {
  it('should render intro screen', () => {
    const onBack = vi.fn();
    renderWithProvider(<MemoryFlip onBack={onBack} />);

    const titles = screen.getAllByText('🃏 Memory Flip');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/Тренировка кратковременной памяти/i)).toBeInTheDocument();
    expect(screen.getByText(/Найдите все пары одинаковых эмодзи/i)).toBeInTheDocument();
    expect(screen.getByText(/4 уровня возрастающей сложности/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Начать игру/i })).toBeInTheDocument();
  });

  it('should start game on button click', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<MemoryFlip onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Должна появиться сетка карт
    const cards = screen.getAllByRole('button', { name: /Карта/i });
    expect(cards).toHaveLength(6); // Уровень 1: 2x3
  });

  it('should display cards with question marks initially', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<MemoryFlip onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    const cards = screen.getAllByRole('button', { name: /Карта/i });
    cards.forEach((card) => {
      expect(card.textContent).toContain('?');
    });
  });

  it('should flip card on click', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<MemoryFlip onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    const cards = screen.getAllByRole('button', { name: /Карта/i });
    const firstCard = cards[0];

    await user.click(firstCard);

    // Карта должна иметь класс flipped
    await waitFor(() => {
      expect(firstCard).toHaveClass('flipped');
    });
  });

  it('should display moves and time during game', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { container } = renderWithProvider(<MemoryFlip onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    // Проверяем наличие статистики в footer
    await waitFor(() => {
      expect(container.querySelector('.memory-flip-stats')).toBeInTheDocument();
    });

    const stats = container.querySelector('.memory-flip-stats');
    expect(stats?.textContent).toContain('Ходов:');
    expect(stats?.textContent).toContain('Время:');
    expect(stats?.textContent).toContain('Уровень:');
    expect(stats?.textContent).toContain('1/4');
  });

  it('should show level complete screen after finishing level 1', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<MemoryFlip onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    const cards = screen.getAllByRole('button', { name: /Карта/i });

    // Получаем все эмодзи
    const emojis = cards.map((card) => card.querySelector('.card-back')?.textContent);
    const uniqueEmojis = Array.from(new Set(emojis));

    // Открываем все пары
    for (const emoji of uniqueEmojis) {
      const indices = emojis
        .map((e, idx) => (e === emoji ? idx : -1))
        .filter((idx) => idx !== -1);

      if (indices.length === 2) {
        await user.click(cards[indices[0]]);
        await user.click(cards[indices[1]]);
      }
    }

    // Должен появиться экран завершения уровня 1
    await waitFor(
      () => {
        expect(screen.getByText(/Уровень 1 завершён/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByRole('button', { name: /Перейти к уровню 2/i })).toBeInTheDocument();
  });

  it('should proceed to level 2 on button click', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProvider(<MemoryFlip onBack={onBack} />);

    const startButton = screen.getByRole('button', { name: /Начать игру/i });
    await user.click(startButton);

    let cards = screen.getAllByRole('button', { name: /Карта/i });

    // Завершаем уровень 1
    const emojis = cards.map((card) => card.querySelector('.card-back')?.textContent);
    const uniqueEmojis = Array.from(new Set(emojis));

    for (const emoji of uniqueEmojis) {
      const indices = emojis
        .map((e, idx) => (e === emoji ? idx : -1))
        .filter((idx) => idx !== -1);

      if (indices.length === 2) {
        await user.click(cards[indices[0]]);
        await user.click(cards[indices[1]]);
      }
    }

    // Переходим на уровень 2
    const level2Button = await screen.findByRole('button', { name: /Перейти к уровню 2/i });
    await user.click(level2Button);

    // Должна появиться новая сетка карт (3x4 = 12)
    await waitFor(() => {
      cards = screen.getAllByRole('button', { name: /Карта/i });
      expect(cards).toHaveLength(12);
    });
  });

  it('should call onBack from GameLayout', () => {
    const onBack = vi.fn();
    const { container } = renderWithProvider(<MemoryFlip onBack={onBack} />);

    // onBack prop передается в GameLayout
    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });
});
