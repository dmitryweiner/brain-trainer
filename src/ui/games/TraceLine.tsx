import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { TRACE, type TraceEvent, type TraceState } from '../../core/games/traceLine/engine';
import { pointAt } from '../../core/games/traceLine/geometry';
import { GameIntro, StatusLine, toBoxPoint } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<TraceState, TraceEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => (
  <GameIntro gameId="trace-line" level={level} onStart={onStart} rules={['trace.rule1', 'trace.rule2', 'trace.rule3']} />
);

const pathD = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const svg = useRef<SVGSVGElement>(null);
  const { path, halfWidth } = state;
  const done = path.points.filter((_, i) => path.cum[i] <= state.progress);
  done.push(pointAt(path, state.progress));
  const start = path.points[0];
  const end = path.points[path.points.length - 1];

  const send = (type: 'down' | 'move', e: React.PointerEvent<SVGSVGElement>) => {
    if (!svg.current) return;
    dispatch({ type, ...toBoxPoint(e, svg.current) });
  };

  const prompt = state.phase === 'feedback'
    ? t(state.results[state.results.length - 1]?.completed ? 'trace.done' : 'trace.timeUp')
    : state.tracing
      ? (state.pointerInside ? t('trace.keepGoing') : t('trace.outside'))
      : t(state.progress > 0 ? 'trace.resume' : 'trace.start');

  return (
    <div className="trace">
      <p className="game-prompt" role="status">{prompt}</p>
      <div className="square-board">
        <svg
          ref={svg}
          className="trace-board"
          viewBox="0 0 100 100"
          onPointerDown={e => {
            try {
              // keep receiving moves when the finger leaves the board
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // pointer already gone: tracing still works inside the board
            }
            send('down', e);
          }}
          onPointerMove={e => state.tracing && send('move', e)}
          onPointerUp={() => dispatch({ type: 'up' })}
          onPointerCancel={() => dispatch({ type: 'up' })}
        >
          <path className="trace-corridor" d={pathD(path.points)} strokeWidth={halfWidth * 2} />
          <path className="trace-guide" d={pathD(path.points)} />
          {state.progress > 0 && <path className="trace-done" d={pathD(done)} />}
          <circle className="trace-start" cx={start.x} cy={start.y} r={halfWidth} />
          <circle className="trace-end" cx={end.x} cy={end.y} r={halfWidth * 0.8} />
          {state.pointer && <circle className={`trace-finger ${state.pointerInside ? '' : 'outside'}`} cx={state.pointer.x} cy={state.pointer.y} r="2.2" />}
        </svg>
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  const inside = state.samples > 0 ? Math.round((state.insideSamples / state.samples) * 100) : 100;
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.round + 1, TRACE.rounds), total: TRACE.rounds }),
      `${t('trace.inside')}: ${inside}%`,
      `${t('trace.progress')}: ${Math.round((state.progress / state.path.length) * 100)}%`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item highlight"><span className="stat-label">{t('trace.inside')}</span><span className="stat-value">{outcome.accuracy}%</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.completed')}</span><span className="stat-value">{outcome.metrics.completed} / {outcome.metrics.rounds}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const TraceLine: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('trace-line')} views={views} title={`✍️ ${t('games.trace-line.title')}`} onBack={onBack} onNextGame={onNextGame} />;
};
