import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameCard } from './common';
import { GAMES_META } from '../utils/constants';
import { useGameHistoryContext } from '../context/GameHistoryContext';
import { getGame } from '../core/games/registry';
import type { GameCategory } from '../core/types';
import type { GameId } from '../types/game.types';
import { WorkoutBlock } from '../ui/WorkoutBlock';
import './GameMenu.scss';

export interface GameMenuProps {
  onGameSelect: (gameId: GameId) => void;
  /** Starts (or continues) today's workout at this game; no block without it */
  onWorkout?: (gameId: GameId) => void;
  now?: number;
}

/** Menu order of the category groups (PLAN-IMPROVEMENTS.md, 3.5) */
const CATEGORY_ORDER: readonly GameCategory[] = ['memory', 'attention', 'reaction', 'spatial', 'knowledge'];

export const GameMenu: React.FC<GameMenuProps> = ({ onGameSelect, onWorkout, now }) => {
  const { getGameStats, getGameLevel, sessions } = useGameHistoryContext();
  const { t } = useTranslation();

  const groups = CATEGORY_ORDER
    .map(category => ({ category, games: GAMES_META.filter(g => getGame(g.id).category === category) }))
    .filter(group => group.games.length > 0);

  return (
    <div className="game-menu">
      <div className="game-menu-header">
        <h1 className="menu-title">{t('menu.title')}</h1>
        <p className="menu-subtitle">{t('menu.subtitle')}</p>
      </div>

      {onWorkout && <WorkoutBlock sessions={sessions} now={now ?? Date.now()} onPlay={onWorkout} />}

      {groups.map(({ category, games }) => (
        <section key={category} className="games-category" aria-labelledby={`category-${category}`}>
          <h2 id={`category-${category}`} className="category-title">{t(`categories.${category}`)}</h2>
          <div className="games-grid">
            {games.map(game => {
              const stats = getGameStats(game.id);
              const def = getGame(game.id);
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  progress={{
                    played: stats.totalGames,
                    bestRating: stats.bestRating,
                    lastRating: stats.last?.rating ?? null,
                    previousRating: stats.previous?.rating ?? null,
                    sparkline: stats.sparkline,
                    level: def.maxLevel > def.minLevel ? getGameLevel(game.id) : undefined,
                  }}
                  onPlay={onGameSelect}
                />
              );
            })}
          </div>
        </section>
      ))}

      <div className="menu-footer">
        <p className="footer-text">{t('menu.footer')}</p>
      </div>
    </div>
  );
};

export default GameMenu;
