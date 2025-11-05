import React from 'react';
import './Header.scss';

export interface HeaderProps {
  totalScore: number;
  showBackButton?: boolean;
  onBack?: () => void;
  gameTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  totalScore,
  showBackButton = false,
  onBack,
  gameTitle,
}) => {
  return (
    <header className="app-header">
      <div className="header-content">
        {showBackButton && (
          <button 
            className="back-button"
            onClick={onBack}
            aria-label="Назад в меню"
          >
            ← Назад
          </button>
        )}
        
        <div className="header-center">
          <h1 className="app-title">
            {gameTitle ? gameTitle : '🧠 Brain Trainer'}
          </h1>
        </div>
        
        <div className="score-display">
          <span className="score-label">Очки:</span>
          <span className="score-value">{totalScore}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;

