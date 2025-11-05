import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

describe('Header', () => {
  it('should render app title by default', () => {
    render(<Header totalScore={0} />);
    expect(screen.getByText('🧠 Brain Trainer')).toBeInTheDocument();
  });

  it('should display total score', () => {
    render(<Header totalScore={150} />);
    expect(screen.getByText('Очки:')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should not show back button by default', () => {
    render(<Header totalScore={0} />);
    expect(screen.queryByText('← Назад')).not.toBeInTheDocument();
  });

  it('should show back button when showBackButton is true', () => {
    const handleBack = vi.fn();
    render(<Header totalScore={0} showBackButton onBack={handleBack} />);
    expect(screen.getByText('← Назад')).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    const handleBack = vi.fn();
    
    render(<Header totalScore={0} showBackButton onBack={handleBack} />);
    
    await user.click(screen.getByText('← Назад'));
    
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('should display game title when provided', () => {
    render(<Header totalScore={0} gameTitle="⚡ Reaction Click" />);
    expect(screen.getByText('⚡ Reaction Click')).toBeInTheDocument();
    expect(screen.queryByText('🧠 Brain Trainer')).not.toBeInTheDocument();
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
    expect(screen.getByText('← Назад')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes on back button', () => {
    const handleBack = vi.fn();
    render(<Header totalScore={0} showBackButton onBack={handleBack} />);
    
    const backButton = screen.getByRole('button', { name: /назад в меню/i });
    expect(backButton).toBeInTheDocument();
  });

  it('should render with zero score', () => {
    render(<Header totalScore={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
