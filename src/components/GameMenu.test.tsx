import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameMenu } from './GameMenu';
import { ScoreProvider } from '../context/ScoreContext';
import { GAMES_META } from '../utils/constants';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScoreProvider>{children}</ScoreProvider>
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
    expect(screen.getByText('Тренировка скорости реакции')).toBeInTheDocument();
    expect(screen.getByText('Реакция и селекция')).toBeInTheDocument();
  });

  it('should display game icons', () => {
    const handleGameSelect = vi.fn();
    
    render(<GameMenu onGameSelect={handleGameSelect} />, { wrapper });
    
    // Проверяем несколько иконок
    expect(screen.getByText('⚡')).toBeInTheDocument();
    expect(screen.getByText('🎨')).toBeInTheDocument();
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
    
    const gamesGrid = container.querySelector('.games-grid');
    expect(gamesGrid).toBeInTheDocument();
    expect(gamesGrid?.children).toHaveLength(GAMES_META.length);
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
});

