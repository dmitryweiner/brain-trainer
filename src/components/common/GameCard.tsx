import React from 'react';
import type { GameMeta } from '../../types/game.types';
import Button from './Button';
import './GameCard.scss';

export interface GameCardProps {
  game: GameMeta;
  bestScore?: number;
  onPlay: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  bestScore,
  onPlay,
}) => {
  return (
    <div className="game-card">
      <div className="game-card-icon">{game.icon}</div>
      <h3 className="game-card-title">{game.title}</h3>
      <p className="game-card-description">{game.description}</p>
      
      <div className="game-card-stats">
        <div className="difficulty">
          <span className="stat-label">Сложность:</span>
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
            <span className="stat-label">Лучший результат:</span>
            <span className="stat-value">{bestScore}</span>
          </div>
        )}
      </div>
      
      <Button
        variant="primary"
        fullWidth
        onClick={() => onPlay(game.id)}
      >
        Играть
      </Button>
    </div>
  );
};

export default GameCard;

