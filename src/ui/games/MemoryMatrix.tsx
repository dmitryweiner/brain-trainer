import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { matrixLayout, MEMORY_MATRIX, type MemoryMatrixEvent, type MemoryMatrixState } from '../../core/games/memoryMatrix/engine';
import { GameIntro, StatusLine } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<MemoryMatrixState, MemoryMatrixEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const { gridSize, cells } = matrixLayout(level);
  return (
    <GameIntro gameId="memory-matrix" level={level} onStart={onStart} rules={['memoryMatrix.rule1', 'memoryMatrix.rule2', 'memoryMatrix.rule3']}>
      <p className="intro-detail">{t('memoryMatrix.layout', { size: gridSize, cells })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { gridSize } = state.layout;
  const found = state.taps.filter(c => state.pattern.includes(c)).length;
  const prompt = state.phase === 'input'
    ? t('memoryMatrix.tap', { left: state.pattern.length - found })
    : state.phase === 'feedback'
      ? t(state.lastPerfect ? 'memoryMatrix.perfect' : 'memoryMatrix.missed')
      : t('memoryMatrix.watch');
  return (
    <div className="memory-matrix">
      <p className="game-prompt" role="status">{prompt}</p>
      <div className="square-board">
        <div className="cell-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {Array.from({ length: gridSize * gridSize }, (_, i) => {
            const inPattern = state.pattern.includes(i);
            const tapped = state.taps.includes(i);
            const cls = [
              'board-cell',
              state.phase === 'showing' && inPattern && 'lit',
              tapped && (inPattern ? 'hit' : 'miss'),
              state.phase === 'feedback' && inPattern && !tapped && 'missed',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={i}
                className={cls}
                disabled={state.phase !== 'input' || tapped}
                aria-label={t('memoryMatrix.cell', { n: i + 1 })}
                onClick={() => dispatch({ type: 'tap', cell: i })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.round + 1, MEMORY_MATRIX.rounds), total: MEMORY_MATRIX.rounds }),
      `${t('common.score')}: ${state.score}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metrics.perfectRounds')}</span><span className="stat-value">{outcome.metrics.perfectRounds} / {outcome.metrics.rounds}</span></div>
      <div className="stat-item"><span className="stat-label">{t('common.accuracy')}</span><span className="stat-value">{outcome.accuracy}%</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const MemoryMatrix: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  return <GameShell game={getGame('memory-matrix')} views={views} onBack={onBack} onNextGame={onNextGame} />;
};
