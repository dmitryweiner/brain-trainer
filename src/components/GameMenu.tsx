import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameCard } from './common';
import { GAMES_META } from '../utils/constants';
import { useScoreContext } from '../context/ScoreContext';
import type { GameId } from '../types/game.types';
import './GameMenu.scss';

export interface GameMenuProps {
  onGameSelect: (gameId: GameId) => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({ onGameSelect }) => {
  const { getGameScore } = useScoreContext();
  const { t } = useTranslation();

  return (
    <div className="game-menu">
      <div className="game-menu-header">
        <h1 className="menu-title">{t('menu.title')}</h1>
        <p className="menu-subtitle">{t('menu.subtitle')}</p>
      </div>

      <div className="games-grid">
        {GAMES_META.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            bestScore={getGameScore(game.id)}
            onPlay={onGameSelect}
          />
        ))}
      </div>

      <div className="menu-footer">
        <p className="footer-text">{t('menu.footer')}</p>
      </div>
    </div>
  );
};

export default GameMenu;
