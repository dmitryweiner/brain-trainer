import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

describe('Header', () => {
  it('should render with total score', () => {
    render(<Header totalScore={100} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display app title by default', () => {
    render(<Header totalScore={0} />);
    expect(screen.getByText('🧠 Brain Trainer')).toBeInTheDocument();
  });

  it('should display game title when provided', () => {
    render(<Header totalScore={0} gameTitle="Reaction Click" />);
    expect(screen.getByText('Reaction Click')).toBeInTheDocument();
    expect(screen.queryByText('🧠 Brain Trainer')).not.toBeInTheDocument();
  });

  it('should not show back button by default', () => {
    render(<Header totalScore={0} />);
    expect(screen.queryByText('← Назад')).not.toBeInTheDocument();
  });

  it('should show back button when showBackButton is true', () => {
    render(<Header totalScore={0} showBackButton />);
    expect(screen.getByText('← Назад')).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    const handleBack = vi.fn();
    
    render(<Header totalScore={0} showBackButton onBack={handleBack} />);
    
    await user.click(screen.getByText('← Назад'));
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('should display score label', () => {
    render(<Header totalScore={50} />);
    expect(screen.getByText('Очки:')).toBeInTheDocument();
  });

  it('should update score when totalScore changes', () => {
    const { rerender } = render(<Header totalScore={10} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    
    rerender(<Header totalScore={20} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it('should have proper aria-label on back button', () => {
    render(<Header totalScore={0} showBackButton />);
    const backButton = screen.getByLabelText('Назад в меню');
    expect(backButton).toBeInTheDocument();
  });
});

