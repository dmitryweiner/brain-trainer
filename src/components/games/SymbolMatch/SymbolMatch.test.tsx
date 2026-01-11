import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SymbolMatch } from './SymbolMatch';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScoreProvider>
    <GameHistoryProvider>{children}</GameHistoryProvider>
  </ScoreProvider>
);

describe('SymbolMatch', () => {
  it('should render intro screen by default', () => {
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const titles = screen.getAllByText(/🔄.*Symbol Match|Найди пару/i);
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/зрительного внимания|Visual attention/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /начать игру|start game/i })).toBeInTheDocument();
  });

  it('should display game instructions on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Правила|Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/символа|symbols/i)).toBeInTheDocument();
    expect(screen.getByText(/совпадают|match/i)).toBeInTheDocument();
  });

  it('should display scoring information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/\+1|answer/i)).toBeInTheDocument();
  });

  it('should start game when button is clicked', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Раунд|Round/i)).toBeInTheDocument();
    });
  });

  it('should show progress bar during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/1.*\/.*20/)).toBeInTheDocument();
    });
  });

  it('should show answer buttons during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/✓.*Совпадают|✓.*Match/i)).toBeInTheDocument();
      expect(screen.getByText(/✗.*Не совпадают|✗.*Don't match/i)).toBeInTheDocument();
    });
  });

  it('should not show results modal initially', () => {
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.queryByText(/Игра завершена|Game Over/i)).not.toBeInTheDocument();
  });

  it('should render with onNextGame prop', () => {
    const handleBackToMenu = vi.fn();
    const handleNextGame = vi.fn();
    
    render(
      <SymbolMatch 
        onBackToMenu={handleBackToMenu} 
        onNextGame={handleNextGame}
      />, 
      { wrapper }
    );
    
    const titles = screen.getAllByText(/🔄.*Symbol Match|Найди пару/i);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should have accessible button on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const startButton = screen.getByRole('button', { name: /начать игру/i });
    expect(startButton).toBeInTheDocument();
  });

  it('should display game layout title', () => {
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const titles = screen.getAllByText(/🔄.*Symbol Match|Найди пару/i);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should have proper structure with GameLayout', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <SymbolMatch onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });

  it('should render intro card with proper styling', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <SymbolMatch onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.symbol-match-intro')).toBeInTheDocument();
    expect(container.querySelector('.intro-card')).toBeInTheDocument();
  });

  it('should display total rounds information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<SymbolMatch onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/20/)).toBeInTheDocument();
  });

  it('should render emojis during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <SymbolMatch onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      const emojis = container.querySelectorAll('.emoji');
      expect(emojis.length).toBe(2);
    });
  });
});

