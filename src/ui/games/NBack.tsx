import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { N_BACK, nBackLayout, type NBackEvent, type NBackState } from '../../core/games/nBack/engine';
import { GameIntro, StatusLine } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<NBackState, NBackEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const { n } = nBackLayout(level);
  return (
    <GameIntro gameId="n-back" level={level} onStart={onStart} rules={['nback.rule1', 'nback.rule2', 'nback.rule3']}>
      <p className="intro-detail">{t('nback.layout', { n, count: n })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const current = state.index >= 0 ? state.sequence[state.index] : -1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        dispatch({ type: 'match' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const canAnswer = state.phase === 'playing' && state.index >= state.n && !state.responded;
  const feedback = state.responded ? state.last : null;
  return (
    <div className="n-back">
      <p className="game-prompt" role="status">
        {state.phase === 'leadIn' ? t('nback.getReady') : state.index < state.n ? t('nback.remember', { count: state.n - state.index }) : t('nback.question', { count: state.n })}
      </p>
      <div className="square-board nback-board">
        <div className="cell-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {Array.from({ length: N_BACK.cells }, (_, i) => (
            <div key={i} className={`board-cell nback-cell ${state.lit && i === current ? 'lit' : ''}`} />
          ))}
        </div>
      </div>
      <button
        className={`btn-custom btn-primary btn-large btn-full nback-match ${feedback ?? ''}`}
        disabled={!canAnswer}
        onPointerDown={() => dispatch({ type: 'match' })}
      >
        {feedback === 'hit' ? `✓ ${t('nback.hit')}` : feedback === 'falseAlarm' ? `✗ ${t('nback.falseAlarm')}` : t('nback.match')}
      </button>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      `N = ${state.n}`,
      `${Math.max(0, state.index + 1)} / ${state.sequence.length}`,
      `${t('metricsByGame.n-back.hits')}: ${state.hits}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  const m = outcome.metrics;
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">N</span><span className="stat-value">{m.n}</span></div>
      <div className="stat-item"><span className="stat-label">{t('metricsByGame.n-back.hits')}</span><span className="stat-value">{m.hits} / {m.hits + m.misses}</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.falseAlarms')}</span><span className="stat-value">{m.falseAlarms}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const NBack: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('n-back')} views={views} title={`⏮️ ${t('games.n-back.title')}`} onBack={onBack} onNextGame={onNextGame} />;
};
