import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GameMeta, GameId } from '../../types/game.types';
import Button from './Button';
import { Sparkline } from '../../ui/charts/charts';
import './GameCard.scss';

/** What the card shows about the player's progress in the game (PLAN-IMPROVEMENTS.md, 4.2) */
export interface CardProgress {
  played: number;
  bestRating: number;
  lastRating: number | null;
  previousRating: number | null;
  /** Ratings of the last 10 sessions, oldest first */
  sparkline: readonly number[];
  /** Shown as a badge for games with levels */
  level?: number;
}

export interface GameCardProps {
  game: GameMeta;
  progress?: CardProgress;
  onPlay: (gameId: GameId) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, progress, onPlay }) => {
  const { t } = useTranslation();

  const title = t(`games.${game.id}.title`, { defaultValue: game.title });
  const description = t(`games.${game.id}.description`, { defaultValue: game.description });
  const played = progress !== undefined && progress.played > 0;
  const change = played && progress.lastRating !== null && progress.previousRating !== null
    ? progress.lastRating - progress.previousRating
    : 0;

  return (
    <div className="game-card">
      {progress?.level !== undefined && (
        <span className="game-card-level">{t('gameCard.level', { level: progress.level })}</span>
      )}
      <div className="game-card-icon">{game.icon}</div>
      <h3 className="game-card-title">{title}</h3>
      <p className="game-card-description">{description}</p>

      <div className="game-card-stats">
        <div className="difficulty">
          <div className="difficulty-stars">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < game.difficulty ? 'star filled' : 'star empty'}>⭐</span>
            ))}
          </div>
        </div>

        {played ? (
          <>
            <div className="best-score">
              <span className="stat-label">{t('gameCard.bestRating')}</span>
              <span className="stat-value">{progress.bestRating}</span>
            </div>
            {progress.lastRating !== null && (
              <div className="last-score">
                <span className="stat-label">{t('gameCard.last')}</span>
                <span className="stat-value-secondary">
                  {progress.lastRating}
                  {change !== 0 && (
                    <span
                      className={`change ${change > 0 ? 'up' : 'down'}`}
                      aria-label={t(change > 0 ? 'gameCard.changeUp' : 'gameCard.changeDown')}
                    >
                      {change > 0 ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </span>
              </div>
            )}
            <Sparkline values={progress.sparkline} label={t('gameCard.trend')} />
          </>
        ) : (
          progress !== undefined && <p className="not-played">{t('gameCard.notPlayed')}</p>
        )}
      </div>

      <Button variant="primary" fullWidth onClick={() => onPlay(game.id)}>
        {t('gameCard.play')}
      </Button>
    </div>
  );
};

export default GameCard;
