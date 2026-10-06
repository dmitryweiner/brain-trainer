import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { currentQuestion, WHERE_WAS, whereLayout, type WhereWasEvent, type WhereWasState } from '../../core/games/whereWas/engine';
import { GameIntro, StatusLine } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<WhereWasState, WhereWasEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const { size, items } = whereLayout(level);
  return (
    <GameIntro gameId="where-was" level={level} onStart={onStart} rules={['whereWas.rule1', 'whereWas.rule2', 'whereWas.rule3']}>
      <p className="intro-detail">{t('whereWas.layout', { size, items })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const q = currentQuestion(state);
  const showing = state.phase === 'showing';
  return (
    <div className="where-was">
      <p className="game-prompt" role="status">
        {showing ? t('whereWas.remember') : q && <>{t('whereWas.where')} <span className="hunt-target">{q.object}</span></>}
      </p>
      <div className="square-board">
        <div className="cell-grid" style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}>
          {Array.from({ length: state.size * state.size }, (_, cell) => {
            const item = state.placed.find(p => p.cell === cell);
            const mark = state.phase === 'feedback' && q
              ? cell === q.cell ? 'right' : cell === state.picked ? 'wrong' : ''
              : '';
            return (
              <button
                key={cell}
                className={`board-cell where-cell ${mark}`}
                disabled={state.phase !== 'asking'}
                onClick={() => dispatch({ type: 'pick', cell })}
                aria-label={t('memoryMatrix.cell', { n: cell + 1 })}
              >
                <span aria-hidden="true">{showing || (state.phase === 'feedback' && q?.cell === cell) ? item?.object ?? '' : ''}</span>
              </button>
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
      t('whereWas.boardOf', { n: Math.min(state.board + 1, WHERE_WAS.boards), total: WHERE_WAS.boards }),
      `${t('metrics.correct')}: ${state.answers.filter(a => a.correct).length}/${state.answers.length}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metrics.correct')}</span><span className="stat-value">{outcome.metrics.correct} / {outcome.metrics.questions}</span></div>
      <div className="stat-item"><span className="stat-label">{t('common.averageTime')}</span><span className="stat-value">{(outcome.avgTimeMs / 1000).toFixed(1)} {t('game.seconds')}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const WhereWas: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('where-was')} views={views} title={`📍 ${t('games.where-was.title')}`} onBack={onBack} onNextGame={onNextGame} />;
};
