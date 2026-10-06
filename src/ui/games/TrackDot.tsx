import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { dotAt, TRACK_DOT, type TrackDotEvent, type TrackDotState } from '../../core/games/trackDot/engine';
import { GameIntro, StatusLine, toBoxPoint, useClock } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<TrackDotState, TrackDotEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => (
  <GameIntro gameId="track-dot" level={level} onStart={onStart} rules={['trackDot.rule1', 'trackDot.rule2', 'trackDot.rule3']} />
);

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const svg = useRef<SVGSVGElement>(null);
  // redraw at about 60 fps from the same path function the engine checks
  const now = useClock(state.phase !== 'done', 16);
  const at = dotAt(state.path, state.phase === 'leadIn' ? 0 : now - state.movingAt);
  const send = (e: React.PointerEvent<SVGSVGElement>) => svg.current && dispatch({ type: 'pointer', ...toBoxPoint(e, svg.current) });

  return (
    <div className="track-dot">
      <p className="game-prompt" role="status">
        {state.phase === 'leadIn' ? t('trackDot.ready') : state.pointer === null ? t('trackDot.touch') : state.onTarget ? t('trackDot.on') : t('trackDot.off')}
      </p>
      <div className="square-board">
        <svg
          ref={svg}
          className="trace-board"
          viewBox="0 0 100 100"
          onPointerDown={e => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // synthetic or vanished pointer
            }
            send(e);
          }}
          onPointerMove={e => (e.buttons > 0 || e.pointerType === 'touch') && send(e)}
          onPointerUp={() => dispatch({ type: 'lift' })}
          onPointerCancel={() => dispatch({ type: 'lift' })}
        >
          <circle className="dot-zone" cx={at.x} cy={at.y} r={state.tolerance} />
          <circle className={`dot-target ${state.onTarget ? 'on' : ''}`} cx={at.x} cy={at.y} r={state.radius} />
          {state.pointer && <circle className="trace-finger" cx={state.pointer.x} cy={state.pointer.y} r="2" />}
        </svg>
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  const now = useClock(state.phase === 'playing', 250);
  const left = state.phase === 'leadIn' ? TRACK_DOT.sessionMs / 1000 : Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  const pct = state.ticks > 0 ? Math.round((state.onTicks / state.ticks) * 100) : 0;
  return <StatusLine items={[`${t('game.timeLeft')}: ${left} ${t('game.seconds')}`, `${t('trackDot.onTarget')}: ${pct}%`]} />;
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item highlight"><span className="stat-label">{t('trackDot.onTarget')}</span><span className="stat-value">{outcome.accuracy}%</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.longestHoldMs')}</span><span className="stat-value">{(outcome.metrics.longestHoldMs / 1000).toFixed(1)} {t('game.seconds')}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const TrackDot: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('track-dot')} views={views} title={`🎯 ${t('games.track-dot.title')}`} onBack={onBack} onNextGame={onNextGame} />;
};
