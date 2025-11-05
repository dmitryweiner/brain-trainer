import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('should render with current and total', () => {
    render(<ProgressBar current={5} total={10} />);
    
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });

  it('should calculate and display percentage correctly', () => {
    render(<ProgressBar current={5} total={10} />);
    
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should display label when provided', () => {
    render(<ProgressBar current={3} total={5} label="Раунд" />);
    
    expect(screen.getByText('Раунд')).toBeInTheDocument();
  });

  it('should hide numbers when showNumbers is false', () => {
    render(<ProgressBar current={5} total={10} showNumbers={false} />);
    
    expect(screen.queryByText('5 / 10')).not.toBeInTheDocument();
  });

  it('should show numbers by default', () => {
    render(<ProgressBar current={3} total={7} />);
    
    expect(screen.getByText('3 / 7')).toBeInTheDocument();
  });

  it('should handle 0% progress', () => {
    render(<ProgressBar current={0} total={10} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 / 10')).toBeInTheDocument();
  });

  it('should handle 100% progress', () => {
    render(<ProgressBar current={10} total={10} />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
  });

  it('should handle edge case of total being 0', () => {
    render(<ProgressBar current={0} total={0} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should round percentage to nearest integer', () => {
    render(<ProgressBar current={1} total={3} />);
    
    // 1/3 = 33.333...% should round to 33%
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<ProgressBar current={7} total={10} label="Progress" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '7');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '10');
    expect(progressBar).toHaveAttribute('aria-label', 'Progress');
  });

  it('should have default aria-label when label not provided', () => {
    render(<ProgressBar current={3} total={5} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Прогресс: 3 из 5');
  });

  it('should apply correct width style based on percentage', () => {
    const { container } = render(<ProgressBar current={6} total={10} />);
    
    const fill = container.querySelector('.progress-fill') as HTMLElement;
    expect(fill).toHaveStyle({ width: '60%' });
  });

  it('should update when props change', () => {
    const { rerender } = render(<ProgressBar current={2} total={10} />);
    expect(screen.getByText('20%')).toBeInTheDocument();
    
    rerender(<ProgressBar current={5} total={10} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('20%')).not.toBeInTheDocument();
  });
});

