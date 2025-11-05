import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameLayout } from './GameLayout';

describe('GameLayout', () => {
  it('should render with title and children', () => {
    render(
      <GameLayout title="Test Game">
        <div>Game content</div>
      </GameLayout>
    );
    
    expect(screen.getByText('Test Game')).toBeInTheDocument();
    expect(screen.getByText('Game content')).toBeInTheDocument();
  });

  it('should not render footer when not provided', () => {
    render(
      <GameLayout title="Test Game">
        <div>Content</div>
      </GameLayout>
    );
    
    expect(screen.queryByText('Footer')).not.toBeInTheDocument();
  });

  it('should render footer when provided', () => {
    render(
      <GameLayout title="Test Game" footer={<div>Footer content</div>}>
        <div>Content</div>
      </GameLayout>
    );
    
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    render(
      <GameLayout title="Test Game">
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </GameLayout>
    );
    
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });

  it('should have proper structure classes', () => {
    const { container } = render(
      <GameLayout title="Test">
        <div>Content</div>
      </GameLayout>
    );
    
    expect(container.querySelector('.game-layout')).toBeInTheDocument();
    expect(container.querySelector('.game-content')).toBeInTheDocument();
    expect(container.querySelector('.game-title')).toBeInTheDocument();
    expect(container.querySelector('.game-body')).toBeInTheDocument();
  });
});

