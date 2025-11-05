import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsModal } from './ResultsModal';

describe('ResultsModal', () => {
  const defaultProps = {
    isOpen: true,
    score: 100,
    onPlayAgain: vi.fn(),
    onBackToMenu: vi.fn(),
  };

  it('should not render when isOpen is false', () => {
    render(<ResultsModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('🎉 Отличная работа!')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<ResultsModal {...defaultProps} />);
    
    expect(screen.getByText('🎉 Отличная работа!')).toBeInTheDocument();
  });

  it('should display score', () => {
    render(<ResultsModal {...defaultProps} score={250} />);
    
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('Заработано очков:')).toBeInTheDocument();
  });

  it('should call onPlayAgain when play again button is clicked', async () => {
    const user = userEvent.setup();
    const handlePlayAgain = vi.fn();
    
    render(<ResultsModal {...defaultProps} onPlayAgain={handlePlayAgain} />);
    
    await user.click(screen.getByText('Играть ещё раз'));
    expect(handlePlayAgain).toHaveBeenCalledTimes(1);
  });

  it('should call onBackToMenu when back to menu button is clicked', async () => {
    const user = userEvent.setup();
    const handleBackToMenu = vi.fn();
    
    render(<ResultsModal {...defaultProps} onBackToMenu={handleBackToMenu} />);
    
    await user.click(screen.getByText('В меню'));
    expect(handleBackToMenu).toHaveBeenCalledTimes(1);
  });

  it('should not show next game button by default', () => {
    render(<ResultsModal {...defaultProps} />);
    
    expect(screen.queryByText('Следующая игра')).not.toBeInTheDocument();
  });

  it('should show next game button when onNextGame is provided', () => {
    const handleNextGame = vi.fn();
    
    render(<ResultsModal {...defaultProps} onNextGame={handleNextGame} />);
    
    expect(screen.getByText('Следующая игра')).toBeInTheDocument();
  });

  it('should call onNextGame when next game button is clicked', async () => {
    const user = userEvent.setup();
    const handleNextGame = vi.fn();
    
    render(<ResultsModal {...defaultProps} onNextGame={handleNextGame} />);
    
    await user.click(screen.getByText('Следующая игра'));
    expect(handleNextGame).toHaveBeenCalledTimes(1);
  });

  it('should not show statistics when not provided', () => {
    render(<ResultsModal {...defaultProps} />);
    
    expect(screen.queryByText('Статистика')).not.toBeInTheDocument();
  });

  it('should show statistics when provided', () => {
    const statistics = [
      { label: 'Точность', value: '80%' },
      { label: 'Время', value: '2.5s' },
    ];
    
    render(<ResultsModal {...defaultProps} statistics={statistics} />);
    
    expect(screen.getByText('Статистика')).toBeInTheDocument();
    expect(screen.getByText('Точность:')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Время:')).toBeInTheDocument();
    expect(screen.getByText('2.5s')).toBeInTheDocument();
  });

  it('should render multiple statistics correctly', () => {
    const statistics = [
      { label: 'Попыток', value: 10 },
      { label: 'Правильных', value: 8 },
      { label: 'Ошибок', value: 2 },
    ];
    
    render(<ResultsModal {...defaultProps} statistics={statistics} />);
    
    statistics.forEach(stat => {
      expect(screen.getByText(`${stat.label}:`)).toBeInTheDocument();
      expect(screen.getByText(stat.value.toString())).toBeInTheDocument();
    });
  });

  it('should have proper ARIA attributes', () => {
    render(<ResultsModal {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'results-title');
  });
});

