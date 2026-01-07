import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onBackToMenu()}>
      <div className="results-modal" role="dialog" aria-modal="true" aria-labelledby="results-title">
        <button 
          className="modal-close"
          onClick={onBackToMenu}
          aria-label={t('app.back')}
        >
          ×
        </button>

        <h2 id="results-title" className="results-title">{title}</h2>
        
        <div className="score-container">
          <div className="results-score-label">{t('common.score')}:</div>
          <div className="results-score-value">🏆 {score} {t('common.points')}</div>
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
              {t('common.nextGame')}
            </Button>
          )}

          <Button
            variant="secondary"
            fullWidth
            onClick={onPlayAgain}
            className="mb-2"
          >
            {t('common.playAgain')}
          </Button>
          
          <Button
            variant="light"
            fullWidth
            onClick={onBackToMenu}
          >
            {t('common.backToMenu')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsModal;
