import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { schulteLayout, type SchulteEvent, type SchulteState } from '../../core/games/schulte/engine';
import { GameIntro, StatusLine, useClock } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<SchulteState, SchulteEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const { size, redBlack } = schulteLayout(level);
  const total = size * size;
  return (
    <GameIntro
      gameId="schulte"
      level={level}
      onStart={onStart}
      rules={redBlack ? ['schulte.ruleRedBlack1', 'schulte.ruleRedBlack2', 'schulte.rule3'] : ['schulte.rule1', 'schulte.rule2', 'schulte.rule3']}
    >
      <p className="intro-detail">{t(redBlack ? 'schulte.layoutRedBlack' : 'schulte.layout', { size, total, blacks: Math.ceil(total / 2), reds: Math.floor(total / 2) })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const want = state.sequence[state.next];
  return (
    <div className="schulte">
      <p className="game-prompt" role="status">
        {want && t(want.color === 'red' ? 'schulte.findRed' : 'schulte.find', { value: want.value })}
      </p>
      <div className="square-board">
        <div className="cell-grid" style={{ gridTemplateColumns: `repeat(${state.layout.size}, 1fr)` }}>
          {state.cells.map((cell, i) => {
            const flash = state.flash?.index === i ? (state.flash.correct ? 'hit' : 'miss') : '';
            return (
              <button
                key={i}
                className={`board-cell schulte-cell ${cell.color} ${flash}`}
                onClick={() => dispatch({ type: 'tap', index: i })}
              >
                {cell.value}
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
  const seconds = Math.max(0, (useClock(state.phase === 'playing') - state.startedAt) / 1000);
  return (
    <StatusLine items={[
      `${t('game.time')}: ${seconds.toFixed(1)} ${t('game.seconds')}`,
      `${t('schulte.found')}: ${state.next} / ${state.sequence.length}`,
      state.errors > 0 && `${t('metrics.errors')}: ${state.errors}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item highlight"><span className="stat-label">{t('metrics.tableMs')}</span><span className="stat-value">{(outcome.metrics.tableMs / 1000).toFixed(1)} {t('game.seconds')}</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.errors')}</span><span className="stat-value">{outcome.metrics.errors}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const Schulte: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  return <GameShell game={getGame('schulte')} views={views} onBack={onBack} onNextGame={onNextGame} />;
};
