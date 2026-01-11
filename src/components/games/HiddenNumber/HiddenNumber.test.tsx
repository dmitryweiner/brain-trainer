import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HiddenNumber } from './HiddenNumber';
import { ScoreProvider } from '../../../context/ScoreContext';
import { GameHistoryProvider } from '../../../context/GameHistoryContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScoreProvider>
    <GameHistoryProvider>{children}</GameHistoryProvider>
  </ScoreProvider>
);

describe('HiddenNumber', () => {
  it('should render intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<HiddenNumber onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const titles = screen.getAllByText(/🔢.*Hidden Number|Скрытое число/i);
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Начать игру|Start game/i })).toBeInTheDocument();
  });

  it('should display instructions', () => {
    const handleBackToMenu = vi.fn();
    
    render(<HiddenNumber onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Правила|Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/визуального поиска|visual search/i)).toBeInTheDocument();
  });

  it('should start game on button click', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<HiddenNumber onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /Начать игру|Start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Раунд|Round/i)).toBeInTheDocument();
    });
  });

  it('should show progress bar during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<HiddenNumber onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByRole('button', { name: /Начать игру|Start game/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/1.*\/.*10/)).toBeInTheDocument();
    });
  });

  it('should render grid during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <HiddenNumber onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    await user.click(screen.getByRole('button', { name: /Начать игру|Start game/i }));
    
    await waitFor(() => {
      const cells = container.querySelectorAll('.grid-cell');
      expect(cells.length).toBe(30); // 5x6 grid
    });
  });

  it('should have game layout', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <HiddenNumber onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });
});

