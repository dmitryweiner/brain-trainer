import React from 'react';
import Button from './Button';
import './ResultsModal.scss';

export interface ResultsModalProps {
  isOpen: boolean;
  score: number;
  statistics?: { label: string; value: string | number }[];
  onPlayAgain: () => void;
  onNextGame?: () => void;
  onBackToMenu: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  isOpen,
  score,
  statistics = [],
  onPlayAgain,
  onNextGame,
  onBackToMenu,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onBackToMenu()}>
      <div className="results-modal" role="dialog" aria-modal="true" aria-labelledby="results-title">
        <h2 id="results-title" className="results-title">🎉 Отличная работа!</h2>
        
        <div className="score-container">
          <div className="score-label">Заработано очков:</div>
          <div className="score-value">{score}</div>
        </div>
        
        {statistics.length > 0 && (
          <div className="statistics">
            <h3 className="statistics-title">Статистика</h3>
            <div className="statistics-list">
              {statistics.map((stat, index) => (
                <div key={index} className="stat-item">
                  <span className="stat-label">{stat.label}:</span>
                  <span className="stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="modal-actions">
          <Button
            variant="primary"
            fullWidth
            onClick={onPlayAgain}
          >
            Играть ещё раз
          </Button>
          
          {onNextGame && (
            <Button
              variant="success"
              fullWidth
              onClick={onNextGame}
            >
              Следующая игра
            </Button>
          )}
          
          <Button
            variant="secondary"
            fullWidth
            onClick={onBackToMenu}
          >
            В меню
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsModal;

