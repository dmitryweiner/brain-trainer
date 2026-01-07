import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OddOneOut } from './OddOneOut';
import { ScoreProvider } from '../../../context/ScoreContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScoreProvider>{children}</ScoreProvider>
);

describe('OddOneOut', () => {
  it('should render intro screen by default', () => {
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const titles = screen.getAllByText('🔍 Odd One Out');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText('Тренировка визуального анализа')).toBeInTheDocument();
    expect(screen.getByText('Начать игру')).toBeInTheDocument();
  });

  it('should display game instructions on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText('Правила:')).toBeInTheDocument();
    expect(screen.getByText(/Найдите/)).toBeInTheDocument();
    expect(screen.getByText(/лишний/)).toBeInTheDocument();
  });

  it('should display difficulty information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText('Уровни сложности:')).toBeInTheDocument();
    expect(screen.getByText(/Раунды 1-3/)).toBeInTheDocument();
    expect(screen.getByText(/Раунды 4-7/)).toBeInTheDocument();
    expect(screen.getByText(/Раунды 8-10/)).toBeInTheDocument();
  });

  it('should display scoring information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Очки:/)).toBeInTheDocument();
    expect(screen.getByText(/\+1 за правильный ответ/)).toBeInTheDocument();
  });

  it('should start game when button is clicked', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      expect(screen.getByText(/Раунд/)).toBeInTheDocument();
    });
  });

  it('should show progress bar during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      expect(screen.getByText(/Раунд 1 \/ 10/)).toBeInTheDocument();
    });
  });

  it('should show difficulty badge during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      // Difficulty badge includes grid size, e.g. "Легко (3×3)"
      expect(screen.getByText(/Легко/)).toBeInTheDocument();
    });
  });

  it('should show instruction text during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      expect(screen.getByText('Найдите лишний символ')).toBeInTheDocument();
    });
  });

  it('should not show results modal initially', () => {
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.queryByText('Игра завершена!')).not.toBeInTheDocument();
  });

  it('should render with onNextGame prop', () => {
    const handleBackToMenu = vi.fn();
    const handleNextGame = vi.fn();
    
    render(
      <OddOneOut 
        onBackToMenu={handleBackToMenu} 
        onNextGame={handleNextGame}
      />, 
      { wrapper }
    );
    
    const titles = screen.getAllByText('🔍 Odd One Out');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should have accessible button on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const startButton = screen.getByRole('button', { name: /начать игру/i });
    expect(startButton).toBeInTheDocument();
  });

  it('should display game layout title', () => {
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const titles = screen.getAllByText('🔍 Odd One Out');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should have proper structure with GameLayout', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <OddOneOut onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });

  it('should render intro card with proper styling', () => {
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <OddOneOut onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    expect(container.querySelector('.odd-one-out-intro')).toBeInTheDocument();
    expect(container.querySelector('.intro-card')).toBeInTheDocument();
  });

  it('should display total rounds information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<OddOneOut onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Всего раундов: 10/)).toBeInTheDocument();
  });

  it('should render emoji grid during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <OddOneOut onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      const grid = container.querySelector('.emoji-grid');
      expect(grid).toBeInTheDocument();
      
      const cells = container.querySelectorAll('.emoji-cell');
      // 3x3 grid for easy difficulty = 9 cells
      expect(cells.length).toBe(9);
    });
  });

  it('should have clickable emoji cells', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    const { container } = render(
      <OddOneOut onBackToMenu={handleBackToMenu} />, 
      { wrapper }
    );
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      const cells = container.querySelectorAll('.emoji-cell');
      // 3x3 grid for easy difficulty = 9 cells
      expect(cells.length).toBe(9);
      cells.forEach(cell => {
        expect(cell.tagName).toBe('BUTTON');
      });
    });
  });
});

