import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { cellsFor, ROTATE_SHAPE, type RotateShapeEvent, type RotateShapeState } from '../../core/games/rotateShape/engine';
import { GameIntro, StatusLine } from './common';
import { ShapeView } from './ShapeView';
import './games.scss';

type Views = GameViews<RotateShapeState, RotateShapeEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  return (
    <GameIntro gameId="rotate-shape" level={level} onStart={onStart} rules={['rotate.rule1', 'rotate.rule2', 'rotate.rule3']}>
      <p className="intro-detail">{t('rotate.layout', { cells: cellsFor(level) })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { current } = state;
  return (
    <div className="rotate-shape">
      <p className="game-prompt">{t('rotate.prompt')}</p>
      <div className="rotate-target">
        <ShapeView shape={current.target} label={t('rotate.target')} />
      </div>
      <div className="rotate-options">
        {current.options.map((shape, i) => {
          const result = state.phase === 'feedback'
            ? i === current.answer ? 'right' : i === state.picked ? 'wrong' : ''
            : '';
          return (
            <button
              key={i}
              className={`board-cell rotate-option ${result}`}
              disabled={state.phase !== 'playing'}
              onClick={() => dispatch({ type: 'pick', index: i })}
              aria-label={t('rotate.option', { n: i + 1 })}
            >
              <ShapeView shape={shape} />
            </button>
          );
        })}
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

export const RotateShape: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('rotate-shape')} views={views} title={`🔷 ${t('games.rotate-shape.title')}`} onBack={onBack} />;
};
