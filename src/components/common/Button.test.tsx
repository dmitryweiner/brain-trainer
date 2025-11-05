import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render with children', () => {
    render(<Button onClick={() => {}}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply primary variant by default', () => {
    render(<Button onClick={() => {}}>Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('btn-primary');
  });

  it('should apply secondary variant', () => {
    render(<Button onClick={() => {}} variant="secondary">Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('btn-secondary');
  });

  it('should apply success variant', () => {
    render(<Button onClick={() => {}} variant="success">Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('btn-success');
  });

  it('should apply danger variant', () => {
    render(<Button onClick={() => {}} variant="danger">Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('btn-danger');
  });

  it('should apply large size class', () => {
    render(<Button onClick={() => {}} size="large">Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('btn-large');
  });

  it('should apply full width class', () => {
    render(<Button onClick={() => {}} fullWidth>Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('btn-full');
  });

  it('should apply custom className', () => {
    render(<Button onClick={() => {}} className="custom-class">Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('custom-class');
  });

  it('should apply aria-label', () => {
    render(<Button onClick={() => {}} ariaLabel="Custom label">Button</Button>);
    const button = screen.getByLabelText('Custom label');
    expect(button).toBeInTheDocument();
  });

  it('should have type="button"', () => {
    render(<Button onClick={() => {}}>Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button onClick={() => {}} disabled>Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toBeDisabled();
  });

  it('should combine multiple classes correctly', () => {
    render(
      <Button 
        onClick={() => {}} 
        variant="success" 
        size="large" 
        fullWidth 
        className="extra"
      >
        Button
      </Button>
    );
    const button = screen.getByText('Button');
    expect(button).toHaveClass('btn-custom');
    expect(button).toHaveClass('btn-success');
    expect(button).toHaveClass('btn-large');
    expect(button).toHaveClass('btn-full');
    expect(button).toHaveClass('extra');
  });
});

