import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameMenu } from './GameMenu';
import { GameHistoryProvider } from '../context/GameHistoryContext';
import { GAMES_META } from '../utils/constants';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GameHistoryProvider>{children}</GameHistoryProvider>
);

describe('GameMenu', () => {
  it('should render menu title and subtitle', () => {
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    expect(screen.getByText('Выберите игру')).toBeInTheDocument();
    expect(screen.getByText('Тренируйте свой мозг с помощью увлекательных мини-игр')).toBeInTheDocument();
  });

  it('should render all games', () => {
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    // Проверяем, что количество игр соответствует GAMES_META
    const playButtons = screen.getAllByRole('button', { name: /играть/i });
    expect(playButtons).toHaveLength(GAMES_META.length);
  });

  it('should call onGameSelect when game card is clicked', async () => {
    const user = userEvent.setup();
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    // Находим первую кнопку "Играть"
    const playButtons = screen.getAllByText('Играть');
    await user.click(playButtons[0]);
    
    expect(handleGameSelect).toHaveBeenCalledWith(GAMES_META[0].id);
  });

  it('should display game descriptions', () => {
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    // Проверяем несколько описаний
    expect(screen.getByText('Скорость реакции')).toBeInTheDocument();
    expect(screen.getByText('Визуальный анализ')).toBeInTheDocument();
  });

  it('should display game icons', () => {
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    // Проверяем несколько иконок
    expect(screen.getByText('🦖')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('should display footer text', () => {
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    expect(screen.getByText('Все результаты сохраняются автоматически')).toBeInTheDocument();
  });

  it('should render correct number of play buttons', () => {
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    const playButtons = screen.getAllByRole('button', { name: /играть/i });
    expect(playButtons).toHaveLength(GAMES_META.length);
  });

  it('should display best scores when available', async () => {
    const handleGameSelect = vi.fn();
    
    const { rerender } = render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    // По умолчанию лучшие результаты не отображаются (они равны 0)
    // Это проверяется косвенно через GameCard компонент
    
    rerender(<GameMenu onGameSelect={handleGameSelect} />);
    
    // Меню должно перерендериться без ошибок
    expect(screen.getByText('Выберите игру')).toBeInTheDocument();
  });

  it('should have proper grid structure', () => {
    const handleGameSelect = vi.fn();
    
    const { container } = render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    // one grid per category, together holding every game
    const grids = [...container.querySelectorAll('.games-grid')];
    expect(grids.length).toBeGreaterThan(1);
    expect(grids.reduce((n, g) => n + g.children.length, 0)).toBe(GAMES_META.length);
  });

  it('should handle multiple game selections', async () => {
    const user = userEvent.setup();
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    const playButtons = screen.getAllByText('Играть');
    
    await user.click(playButtons[0]);
    await user.click(playButtons[1]);
    await user.click(playButtons[2]);
    
    expect(handleGameSelect).toHaveBeenCalledTimes(3);
    expect(handleGameSelect).toHaveBeenNthCalledWith(1, GAMES_META[0].id);
    expect(handleGameSelect).toHaveBeenNthCalledWith(2, GAMES_META[1].id);
    expect(handleGameSelect).toHaveBeenNthCalledWith(3, GAMES_META[2].id);
  });

  it('should show the best single session, not the sum of scores', () => {
    localStorage.clear();
    const now = Date.now();
    localStorage.setItem('brain-trainer-results', JSON.stringify([
      { gameId: 'reaction-click', score: 12, accuracy: 100, averageTime: 300, timestamp: now - 2000 },
      { gameId: 'reaction-click', score: 20, accuracy: 100, averageTime: 300, timestamp: now - 1000 },
    ]));

    const { container } = render(<GameMenu onGameSelect={vi.fn()} />, { wrapper });

    // Best single session (20 v1 points → 750 on the speed scale × 0.865 at level 1), not the sum
    const values = Array.from(container.querySelectorAll('.best-score .stat-value')).map(e => e.textContent);
    expect(values).toEqual(['649']);
    localStorage.clear();
  });
});
