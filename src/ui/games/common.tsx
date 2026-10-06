// Pieces every game view shares: the intro card, lives, a status line.
import React, { useEffect, useState } from 'react';
import { useServices } from '../services';
import { useTranslation } from 'react-i18next';
import type { GameId } from '../../core/types';
import { getGame } from '../../core/games/registry';
import './common.scss';

export interface GameIntroProps {
  gameId: GameId;
  level: number;
  /** i18n keys of the rule lines */
  rules: string[];
  onStart: (variant?: string) => void;
  /** Replaces the single start button (e.g. one button per mode) */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const GameIntro: React.FC<GameIntroProps> = ({ gameId, level, rules, onStart, actions, children }) => {
  const { t } = useTranslation();
  const game = getGame(gameId);
  return (
    <div className="game-intro">
      <div className="intro-card">
        <h2>{game.icon} {t(`games.${gameId}.title`)}</h2>
        <p className="lead">{t(`games.${gameId}.description`)}</p>
        <ul className="intro-rules">
          {rules.map(key => <li key={key}>{t(key)}</li>)}
        </ul>
        {children}
        {game.maxLevel > game.minLevel && (
          <p className="intro-level">{t('game.levelLine', { level, max: game.maxLevel })}</p>
        )}
        {actions ?? (
          <button className="btn-custom btn-primary btn-large btn-full" onClick={() => onStart()}>
            {t('common.startGame')}
          </button>
        )}
      </div>
    </div>
  );
};

export const Lives: React.FC<{ left: number; total: number }> = ({ left, total }) => {
  const { t } = useTranslation();
  return (
    // <i>, not <span>: the footer styles every span as a stat chip
    <i className="lives" role="img" aria-label={t('game.livesLeft', { left, total })}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < left ? 'life' : 'life lost'}>{i < left ? '❤️' : '🤍'}</i>
      ))}
    </i>
  );
};

/** Footer row: label/value pairs */
export const StatusLine: React.FC<{ items: (React.ReactNode | null | false)[] }> = ({ items }) => (
  <div className="game-stats">
    {items.filter(Boolean).map((item, i) => <span key={i}>{item}</span>)}
  </div>
);

/** Large tick or cross over the board */
export const FeedbackMark: React.FC<{ correct: boolean }> = ({ correct }) => {
  const { t } = useTranslation();
  return (
    <div className={`feedback-mark ${correct ? 'correct' : 'incorrect'}`} role="status">
      <span aria-hidden="true">{correct ? '✓' : '✗'}</span>
      <span className="sr-only">{t(correct ? 'common.correct' : 'common.incorrect')}</span>
    </div>
  );
};

/** Converts a pointer event to the 0–100 coordinates of an SVG with viewBox "0 0 100 100" */
// eslint-disable-next-line react-refresh/only-export-components
export function toBoxPoint(e: React.PointerEvent<Element>, box: Element): { x: number; y: number } {
  const r = box.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
}

/** The scheduler's clock, refreshed a few times a second while `running` (for countdowns) */
// eslint-disable-next-line react-refresh/only-export-components
export function useClock(running: boolean, everyMs = 250): number {
  const { scheduler } = useServices();
  const [now, setNow] = useState(() => scheduler.now());
  useEffect(() => {
    if (!running) return;
    let handle = scheduler.setTimeout(function tick() {
      setNow(scheduler.now());
      handle = scheduler.setTimeout(tick, everyMs);
    }, everyMs);
    return () => scheduler.clearTimeout(handle);
  }, [scheduler, running, everyMs]);
  return now;
}
