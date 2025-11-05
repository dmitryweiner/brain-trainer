import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorTap } from './ColorTap';
import { ScoreProvider } from '../../../context/ScoreContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScoreProvider>{children}</ScoreProvider>
);

describe('ColorTap', () => {
  it('should render intro screen by default', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    const titles = screen.getAllByText('🎨 Color Tap');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText('Тренировка реакции и внимания')).toBeInTheDocument();
    expect(screen.getByText('Начать игру')).toBeInTheDocument();
  });

  it('should display game instructions on intro screen', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText(/Правила:/)).toBeInTheDocument();
    expect(screen.getByText(/Зелёный круг/)).toBeInTheDocument();
    expect(screen.getByText(/Красный круг/)).toBeInTheDocument();
  });

  it('should display scoring information', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.getByText('Очки:')).toBeInTheDocument();
    expect(screen.getByText(/\+1 очко/)).toBeInTheDocument();
    expect(screen.getByText(/\+0.5 бонус/)).toBeInTheDocument();
  });

  it('should start game when button is clicked', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      expect(screen.getByText(/Раунд/)).toBeInTheDocument();
    });
  });

  it('should show round indicator during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      expect(screen.getByText(/Раунд 1 \/ 20/)).toBeInTheDocument();
    });
  });

  it('should show answer buttons during game', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    await user.click(screen.getByText('Начать игру'));
    
    await waitFor(() => {
      expect(screen.getByText(/✓ ДА/)).toBeInTheDocument();
      expect(screen.getByText(/✗ НЕТ/)).toBeInTheDocument();
    });
  });

  it('should not show results modal initially', () => {
    const handleBackToMenu = vi.fn();
    
    render(<ColorTap onBackToMenu={handleBackToMenu} />, { wrapper });
    
    expect(screen.queryByText('Игра завершена!')).not.toBeInTheDocument();
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
    
    const titles = screen.getAllByText('🎨 Color Tap');
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
    
    const titles = screen.getAllByText('🎨 Color Tap');
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
    
    expect(screen.getByText(/Всего раундов: 20/)).toBeInTheDocument();
  });
});

