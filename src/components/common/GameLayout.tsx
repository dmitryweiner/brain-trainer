import React from 'react';
import './GameLayout.scss';

export interface GameLayoutProps {
  /** Shown above the game; GameShell games leave it empty (the header names the game) */
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  title,
  children,
  footer,
}) => {
  return (
    <div className="game-layout">
      <div className="game-content">
        {title && <h2 className="game-title">{title}</h2>}
        <div className="game-body">
          {children}
        </div>
      </div>
      {footer && (
        <div className="game-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default GameLayout;

