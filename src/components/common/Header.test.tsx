import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

describe('Header', () => {
  it('should render app title by default', () => {
    render(<Header totalScore={0} />);
    // i18n translates 'app.title' to 'Тренажёр мозга'
    expect(screen.getByText(/Тренажёр мозга/)).toBeInTheDocument();
  });

  it('should display total score', () => {
    render(<Header totalScore={150} />);
    // i18n translates 'app.score' to 'Очки'
    expect(screen.getByText('Очки:')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should not show back button by default', () => {
    const { container } = render(<Header totalScore={0} />);
    expect(container.querySelector('.back-button')).not.toBeInTheDocument();
  });

  it('should show back button when showBackButton is true', () => {
    const handleBack = vi.fn();
    const { container } = render(<Header totalScore={0} showBackButton onBack={handleBack} />);
    expect(container.querySelector('.back-button')).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    const handleBack = vi.fn();
    
    const { container } = render(<Header totalScore={0} showBackButton onBack={handleBack} />);
    
    const backButton = container.querySelector('.back-button') as HTMLElement;
    await user.click(backButton);
    
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('should display game title when provided', () => {
    render(<Header totalScore={0} gameTitle="⚡ Reaction Click" />);
    expect(screen.getByText('⚡ Reaction Click')).toBeInTheDocument();
    expect(screen.queryByText(/Тренажёр мозга/)).not.toBeInTheDocument();
  });

  it('should show game title with back button', () => {
    const handleBack = vi.fn();
    render(
      <Header 
        totalScore={100} 
        showBackButton 
        onBack={handleBack}
        gameTitle="🎨 Color Tap"
      />
    );
    
    expect(screen.getByText('🎨 Color Tap')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes on back button', () => {
    const handleBack = vi.fn();
    render(<Header totalScore={0} showBackButton onBack={handleBack} />);
    
    // i18n translates 'app.back' to 'Назад'
    const backButton = screen.getByRole('button', { name: /назад/i });
    expect(backButton).toBeInTheDocument();
  });

  it('should render with zero score', () => {
    render(<Header totalScore={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
