import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameCard } from './common';
import { GAMES_META } from '../utils/constants';
import { useGameHistoryContext } from '../context/GameHistoryContext';
import type { GameId } from '../types/game.types';
import './GameMenu.scss';

export interface GameMenuProps {
  onGameSelect: (gameId: GameId) => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({ onGameSelect }) => {
  // Best single-session score, not the running total from useScore
  const { getGameStats } = useGameHistoryContext();
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
            bestScore={getGameStats(game.id).bestScore}
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
