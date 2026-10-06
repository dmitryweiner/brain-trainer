import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { boardsFor, type MemoryFlipEvent, type MemoryFlipState } from '../../core/games/memoryFlip/engine';
import { GameIntro, StatusLine } from './common';
import './games.scss';

type Views = GameViews<MemoryFlipState, MemoryFlipEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const boards = boardsFor(level).map(b => `${b.rows}×${b.cols}`).join(', ');
  return (
    <GameIntro gameId="memory-flip" level={level} onStart={onStart} rules={['flip.rule1', 'flip.rule2', 'flip.rule3']}>
      <p className="intro-detail">{t('flip.layout', { boards })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { rows, cols } = state.boards[state.board];
  return (
    <div className="memory-flip">
      <p className="game-prompt" role="status">
        {state.phase === 'boardDone' ? t('flip.boardDone') : t('flip.boardOf', { n: state.board + 1, total: state.boards.length })}
      </p>
      <div className="flip-board" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols} / ${rows}` }}>
        {state.cards.map((card, i) => {
          const up = card.matched || state.open.includes(i);
          return (
            <button
              key={`${state.board}-${i}`}
              className={`board-cell flip-card ${up ? 'up' : ''} ${card.matched ? 'matched' : ''}`}
              disabled={state.phase !== 'playing' || up}
              onClick={() => dispatch({ type: 'flip', index: i })}
              aria-label={up ? card.emoji : t('flip.hidden', { n: i + 1 })}
            >
              <span aria-hidden="true">{up ? card.emoji : '❓'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  const pairs = state.cards.filter(c => c.matched).length / 2;
  return (
    <StatusLine items={[
      `${t('flip.pairs')}: ${pairs}/${state.cards.length / 2}`,
      `${t('flip.moves')}: ${state.moves}`,
      `${t('common.score')}: ${state.score}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metrics.moves')}</span><span className="stat-value">{outcome.metrics.moves}</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.pairs')}</span><span className="stat-value">{outcome.metrics.pairs}</span></div>
      <div className="stat-item"><span className="stat-label">{t('flip.efficiency')}</span><span className="stat-value">{outcome.accuracy}%</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const MemoryFlip: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('memory-flip')} views={views} title={`🃏 ${t('games.memory-flip.title')}`} onBack={onBack} />;
};
