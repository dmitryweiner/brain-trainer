import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { cellsFor, ROTATE_SHAPE, type RotateShapeEvent, type RotateShapeState } from '../../core/games/rotateShape/engine';
import { GameIntro, StatusLine } from './common';
import { ShapeView } from './ShapeView';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<RotateShapeState, RotateShapeEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  return (
    <GameIntro gameId="rotate-shape" level={level} onStart={onStart} rules={['fit.rule1', 'fit.rule2', 'fit.rule3']}>
      <p className="intro-detail">{t('rotate.layout', { cells: cellsFor(level) })}</p>
    </GameIntro>
  );
};

/** The square with the hole; after an answer the right piece is shown in it */
const HoleBoard: React.FC<{ board: number; hole: readonly (readonly [number, number])[]; filled: boolean; label: string }> = ({
  board, hole, filled, label,
}) => {
  const isHole = (x: number, y: number) => hole.some(c => c[0] === x && c[1] === y);
  return (
    <svg className="fit-board" viewBox={`0 0 ${board} ${board}`} role="img" aria-label={label}>
      {Array.from({ length: board * board }, (_, i) => {
        const x = i % board;
        const y = Math.floor(i / board);
        const h = isHole(x, y);
        return <rect key={i} x={x + 0.04} y={y + 0.04} width="0.92" height="0.92" rx="0.1" className={h ? (filled ? 'fit-filled' : 'fit-hole') : 'fit-solid'} />;
      })}
    </svg>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { current } = state;
  const feedback = state.phase === 'feedback';
  return (
    <div className="rotate-shape">
      <p className="game-prompt">{t('fit.prompt')}</p>
      <div className="rotate-target">
        <HoleBoard board={current.board} hole={current.hole} filled={feedback} label={t('fit.board')} />
      </div>
      <div className="rotate-options">
        {current.options.map((shape, i) => (
          <button
            key={i}
            className={`board-cell rotate-option ${feedback ? (i === current.answer ? 'right' : i === state.picked ? 'wrong' : '') : ''}`}
            disabled={state.phase !== 'playing'}
            onClick={() => dispatch({ type: 'pick', index: i })}
            aria-label={t('rotate.option', { n: i + 1 })}
          >
            <ShapeView shape={shape} />
          </button>
        ))}
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  const correct = state.answers.filter(a => a.correct).length;
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.round + 1, ROTATE_SHAPE.rounds), total: ROTATE_SHAPE.rounds }),
      `${t('metrics.correct')}: ${correct}/${state.answers.length}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metrics.correct')}</span><span className="stat-value">{outcome.metrics.correct} / {outcome.metrics.rounds}</span></div>
      <div className="stat-item"><span className="stat-label">{t('common.averageTime')}</span><span className="stat-value">{(outcome.avgTimeMs / 1000).toFixed(1)} {t('game.seconds')}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const RotateShape: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  return <GameShell game={getGame('rotate-shape')} views={views} onBack={onBack} onNextGame={onNextGame} />;
};
