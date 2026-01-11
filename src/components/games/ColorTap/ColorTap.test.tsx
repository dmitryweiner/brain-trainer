import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorTap } from './ColorTap';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScoreProvider>
    <GameHistoryProvider>{children}</GameHistoryProvider>
  </ScoreProvider>
);

describe('ColorTap', () => {
  it('should render intro screen by default', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const titles = screen.getAllByText(/🎨.*Color Tap|Нажми на цвет/i);
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/Тренировка реакции|Reaction and attention/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /начать игру|start game/i })).toBeInTheDocument();
  });

  it('should display game instructions on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Правила|Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/Зелёный|green/i)).toBeInTheDocument();
    expect(screen.getByText(/Красный|red/i)).toBeInTheDocument();
  });

  it('should display scoring information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Очки|Points/i)).toBeInTheDocument();
    expect(screen.getByText(/\+1|correct/i)).toBeInTheDocument();
    expect(screen.getByText(/\+0.5|bonus/i)).toBeInTheDocument();
  });

  it('should start game when button is clicked', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Раунд|Round/i)).toBeInTheDocument();
    });
  });

  it('should show round indicator during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/1.*\/.*20/)).toBeInTheDocument();
    });
  });

  it('should show answer buttons during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/✓.*ДА|✓.*YES/i)).toBeInTheDocument();
      expect(screen.getByText(/✗.*НЕТ|✗.*NO/i)).toBeInTheDocument();
    });
  });

  it('should not show results modal initially', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.queryByText(/Игра завершена|Game Over/i)).not.toBeInTheDocument();
  });

  it('should render with onNextGame prop', () => {
    const handleBackToMenu = vi.fn();
    const handleNextGame = vi.fn();
    
    render(
      <ColorTap 
        onBackToMenu={handleBackToMenu} 
        onNextGame={handleNextGame}
      />, 
      { wrapper }
    );
    
    const titles = screen.getAllByText(/🎨.*Color Tap|Нажми на цвет/i);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should have accessible button on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const startButton = screen.getByRole('button', { name: /начать игру/i });
    expect(startButton).toBeInTheDocument();
  });

  it('should display game layout title', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <ColorTap onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    const titles = screen.getAllByText(/🎨.*Color Tap|Нажми на цвет/i);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should have proper structure with GameLayout', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <ColorTap onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });

  it('should render intro card with proper styling', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <ColorTap onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.color-tap-intro')).toBeInTheDocument();
    expect(container.querySelector('.intro-card')).toBeInTheDocument();
  });

  it('should display total rounds information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/20/)).toBeInTheDocument();
  });
});

