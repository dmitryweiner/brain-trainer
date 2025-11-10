import React from 'react';
import Button from './Button';
import './ResultsModal.scss';

export interface ResultsModalProps {
  show: boolean;
  title: string;
  score: number;
  message: string;
  details?: React.ReactNode;
  onPlayAgain: () => void;
  onNextGame?: () => void;
  onBackToMenu: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  show,
  title,
  score,
  message,
  details,
  onPlayAgain,
  onNextGame,
  onBackToMenu,
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onBackToMenu()}>
      <div className="results-modal" role="dialog" aria-modal="true" aria-labelledby="results-title">
        <button 
          className="modal-close"
          onClick={onBackToMenu}
          aria-label="Закрыть"
        >
          ×
        </button>

        <h2 id="results-title" className="results-title">{title}</h2>
        
        <div className="score-container">
          <div className="results-score-label">Ваш результат:</div>
          <div className="results-score-value">🏆 {score} очков</div>
        </div>

        <p className="message">{message}</p>
        
        {details && (
          <div className="details-container">
            {details}
          </div>
        )}
        
        <div className="modal-actions">
          {onNextGame && (
            <Button
              variant="primary"
              fullWidth
              onClick={onNextGame}
              className="mb-2"
            >
              Следующая игра
            </Button>
          )}

          <Button
            variant="secondary"
            fullWidth
            onClick={onPlayAgain}
            className="mb-2"
          >
            Играть ещё раз
          </Button>
          
          <Button
            variant="light"
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

