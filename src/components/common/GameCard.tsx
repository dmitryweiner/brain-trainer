import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GameMeta } from '../../types/game.types';
import Button from './Button';
import './GameCard.scss';

import type { GameId } from '../../types/game.types';

export interface GameCardProps {
  game: GameMeta;
  bestScore?: number;
  onPlay: (gameId: GameId) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  bestScore,
  onPlay,
}) => {
  const { t } = useTranslation();
  
  // Get translated title and description
  const title = t(`games.${game.id}.title`, { defaultValue: game.title });
  const description = t(`games.${game.id}.description`, { defaultValue: game.description });

  return (
    <div className="game-card">
      <div className="game-card-icon">{game.icon}</div>
      <h3 className="game-card-title">{title}</h3>
      <p className="game-card-description">{description}</p>
      
      <div className="game-card-stats">
        <div className="difficulty">
          <div className="difficulty-stars">
            {Array.from({ length: 5 }, (_, i) => (
              <span 
                key={i} 
                className={i < game.difficulty ? 'star filled' : 'star empty'}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>
        
        {bestScore !== undefined && bestScore > 0 && (
          <div className="best-score">
            <span className="stat-label">{t('gameCard.bestScore')}:</span>
            <span className="stat-value">{bestScore}</span>
          </div>
        )}
      </div>
      
      <Button
        variant="primary"
        fullWidth
        onClick={() => onPlay(game.id)}
      >
        {t('gameCard.play')}
      </Button>
    </div>
  );
};

export default GameCard;
