import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactionClick } from './ReactionClick';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScoreProvider>
    <GameHistoryProvider>{children}</GameHistoryProvider>
  </ScoreProvider>
);

describe('ReactionClick', () => {
  it('should render intro screen by default', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const titles = screen.getAllByText(/⚡.*Reaction Click|Скорость реакции/i);
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText(/скорости реакции|Reaction speed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /начать игру|start game/i })).toBeInTheDocument();
  });

  it('should display game instructions on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Дождитесь/)).toBeInTheDocument();
    expect(screen.getByText(/быстрее/)).toBeInTheDocument();
  });

  it('should display scoring information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText('Очки за скорость:')).toBeInTheDocument();
    expect(screen.getByText(/5 очков/)).toBeInTheDocument();
    expect(screen.getByText(/3 очка/)).toBeInTheDocument();
  });

  it('should start game when button is clicked', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Ждите|Wait/i)).toBeInTheDocument();
    });
  });

  it('should show attempt counter during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      // New format: "Попытка 1 / 5"
      expect(screen.getByText(/1.*\/.*5/)).toBeInTheDocument();
    });
  });

  it('should show waiting screen after starting game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      // After starting, should show waiting or ready state
      expect(screen.getByText(/Ждите|Wait/i)).toBeInTheDocument();
    });
  });

  it('should show bomb emoji during waiting state', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /начать игру|start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText('💣')).toBeInTheDocument();
    });
  });

  it('should not show results modal initially', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.queryByText(/Игра завершена|Game Over/i)).not.toBeInTheDocument();
  });

  it('should render with onNextGame prop', () => {
    const handleBackToMenu = vi.fn();
    const handleNextGame = vi.fn();
    
    render(
      <ReactionClick 
        onBackToMenu={handleBackToMenu} 
        onNextGame={handleNextGame}
      />, 
      { wrapper }
    );
    
    const titles = screen.getAllByText(/⚡.*Reaction Click|Скорость реакции/i);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should have accessible button on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const startButton = screen.getByRole('button', { name: /начать игру/i });
    expect(startButton).toBeInTheDocument();
  });

  it('should display game layout title', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <ReactionClick onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    const titles = screen.getAllByText(/⚡.*Reaction Click|Скорость реакции/i);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should have proper structure with GameLayout', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <ReactionClick onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });

  it('should render intro card with proper styling', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <ReactionClick onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.reaction-intro')).toBeInTheDocument();
    expect(container.querySelector('.intro-card')).toBeInTheDocument();
  });

  it('should display total rounds information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ReactionClick onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Всего попыток: 5/)).toBeInTheDocument();
  });
});

