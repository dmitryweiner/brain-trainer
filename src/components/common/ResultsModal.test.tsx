import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsModal } from './ResultsModal';

describe('ResultsModal', () => {
  let mockProps: {
    show: boolean;
    title: string;
    score: number;
    message: string;
    onPlayAgain: ReturnType<typeof vi.fn>;
    onBackToMenu: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockProps = {
      show: true,
      title: '🎮 Игра завершена!',
      score: 100,
      message: '⚡ Отличная работа!',
      onPlayAgain: vi.fn(),
      onBackToMenu: vi.fn(),
    };
  });

  it('should not render when show is false', () => {
    const { container } = render(<ResultsModal {...mockProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when show is true', () => {
    render(<ResultsModal {...mockProps} />);
    expect(screen.getByText('🎮 Игра завершена!')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<ResultsModal {...mockProps} />);
    expect(screen.getByText('🎮 Игра завершена!')).toBeInTheDocument();
  });

  it('should display score', () => {
    render(<ResultsModal {...mockProps} />);
    expect(screen.getByText(/100 очков/)).toBeInTheDocument();
  });

  it('should display message', () => {
    render(<ResultsModal {...mockProps} />);
    expect(screen.getByText('⚡ Отличная работа!')).toBeInTheDocument();
  });

  it('should call onPlayAgain when button clicked', async () => {
    const user = userEvent.setup();
    render(<ResultsModal {...mockProps} />);
    
    await user.click(screen.getByText('Играть ещё раз'));
    
    expect(mockProps.onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('should call onBackToMenu when button clicked', async () => {
    const user = userEvent.setup();
    render(<ResultsModal {...mockProps} />);
    
    await user.click(screen.getByText('В меню'));
    
    expect(mockProps.onBackToMenu).toHaveBeenCalledTimes(1);
  });

  it('should show next game button when onNextGame provided', () => {
    const onNextGame = vi.fn();
    render(<ResultsModal {...mockProps} onNextGame={onNextGame} />);
    
    expect(screen.getByText('Следующая игра')).toBeInTheDocument();
  });

  it('should not show next game button when onNextGame not provided', () => {
    render(<ResultsModal {...mockProps} />);
    
    expect(screen.queryByText('Следующая игра')).not.toBeInTheDocument();
  });

  it('should call onNextGame when button clicked', async () => {
    const user = userEvent.setup();
    const onNextGame = vi.fn();
    render(<ResultsModal {...mockProps} onNextGame={onNextGame} />);
    
    await user.click(screen.getByText('Следующая игра'));
    
    expect(onNextGame).toHaveBeenCalledTimes(1);
  });

  it('should render details when provided', () => {
    const details = <div data-testid="custom-details">Custom Details</div>;
    render(<ResultsModal {...mockProps} details={details} />);
    
    expect(screen.getByTestId('custom-details')).toBeInTheDocument();
    expect(screen.getByText('Custom Details')).toBeInTheDocument();
  });

  it('should have close button', () => {
    render(<ResultsModal {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: /закрыть/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('should call onBackToMenu when close button clicked', async () => {
    const user = userEvent.setup();
    render(<ResultsModal {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: /закрыть/i });
    await user.click(closeButton);
    
    expect(mockProps.onBackToMenu).toHaveBeenCalledTimes(1);
  });
});
