import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameCard } from './GameCard';
import { GameMeta } from '../../types/game.types';

const mockGame: GameMeta = {
  id: 'test-game',
  title: 'Test Game',
  description: 'A test game description',
  icon: '🎮',
  difficulty: 3,
};

describe('GameCard', () => {
  it('should render game information', () => {
    render(<GameCard game={mockGame} onPlay={() => {}} />);
    
    expect(screen.getByText('Test Game')).toBeInTheDocument();
    expect(screen.getByText('A test game description')).toBeInTheDocument();
    expect(screen.getByText('🎮')).toBeInTheDocument();
  });

  it('should call onPlay with game id when play button is clicked', async () => {
    const user = userEvent.setup();
    const handlePlay = vi.fn();
    
    render(<GameCard game={mockGame} onPlay={handlePlay} />);
    
    // Button text uses i18n 'gameCard.play' = 'Играть'
    await user.click(screen.getByRole('button'));
    expect(handlePlay).toHaveBeenCalledWith('test-game');
  });

  it('should display difficulty stars correctly', () => {
    const { container } = render(<GameCard game={mockGame} onPlay={() => {}} />);
    
    const stars = container.querySelectorAll('.star');
    expect(stars).toHaveLength(5);
    
    const filledStars = container.querySelectorAll('.star.filled');
    expect(filledStars).toHaveLength(3);
  });

  it('should not show best score when not provided', () => {
    const { container } = render(<GameCard game={mockGame} onPlay={() => {}} />);
    
    expect(container.querySelector('.best-score')).not.toBeInTheDocument();
  });

  it('should show best score when provided and greater than 0', () => {
    const { container } = render(<GameCard game={mockGame} bestScore={100} onPlay={() => {}} />);
    
    const bestScoreElement = container.querySelector('.best-score');
    expect(bestScoreElement).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should not show best score when it is 0', () => {
    const { container } = render(<GameCard game={mockGame} bestScore={0} onPlay={() => {}} />);
    
    expect(container.querySelector('.best-score')).not.toBeInTheDocument();
  });

  it('should render difficulty stars', () => {
    const { container } = render(<GameCard game={mockGame} onPlay={() => {}} />);
    
    const stars = container.querySelector('.difficulty-stars');
    expect(stars).toBeInTheDocument();
  });

  it('should render all difficulty levels correctly', () => {
    const easyGame = { ...mockGame, difficulty: 1 };
    const { container, rerender } = render(<GameCard game={easyGame} onPlay={() => {}} />);
    
    let filledStars = container.querySelectorAll('.star.filled');
    expect(filledStars).toHaveLength(1);
    
    const hardGame = { ...mockGame, difficulty: 5 };
    rerender(<GameCard game={hardGame} onPlay={() => {}} />);
    
    filledStars = container.querySelectorAll('.star.filled');
    expect(filledStars).toHaveLength(5);
  });
});

