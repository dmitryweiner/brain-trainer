import React from 'react';
import './GameLayout.scss';

export interface GameLayoutProps {
  title: string;
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
        <h2 className="game-title">{title}</h2>
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

