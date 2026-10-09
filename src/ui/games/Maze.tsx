import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { MAZE, mazeSize, OPEN, type Dir, type MazeEvent, type MazeState } from '../../core/games/maze/engine';
import { GameIntro, StatusLine, useClock } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<MazeState, MazeEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const size = mazeSize(level);
  return (
    <GameIntro gameId="maze" level={level} onStart={onStart} rules={['maze.rule1', 'maze.rule2', 'maze.rule3']}>
      <p className="intro-detail">{t('maze.layout', { size })}</p>
    </GameIntro>
  );
};

const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
const ARROWS: [Dir, string][] = [['up', '↑'], ['left', '←'], ['down', '↓'], ['right', '→']];

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { size, cells } = state.maze;
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const move = (dir: Dir) => dispatch({ type: 'move', dir });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        dispatch({ type: 'move', dir });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const center = (i: number) => [(i % size) + 0.5, Math.floor(i / size) + 0.5] as const;
  const walls: string[] = [];
  cells.forEach((bits, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    if (!(bits & OPEN.up)) walls.push(`M${x} ${y}h1`);
    if (!(bits & OPEN.left)) walls.push(`M${x} ${y}v1`);
    if (x === size - 1 && !(bits & OPEN.right)) walls.push(`M${x + 1} ${y}v1`);
    if (y === size - 1 && !(bits & OPEN.down)) walls.push(`M${x} ${y + 1}h1`);
  });
  const [bx, by] = center(state.ball);
  const [ex, ey] = center(size * size - 1);
  const ending = state.phase === 'solved' ? state.runs[state.runs.length - 1]?.ending : undefined;
  const lost = ending !== undefined && ending !== 'exit';

  return (
    <div className="maze">
      <p className={`game-prompt ${lost ? 'maze-lost' : ''}`} role="status">{ending ? t(`maze.ending.${ending}`) : t('maze.prompt')}</p>
      <div className="maze-layout">
      <div className="square-board">
        <svg
          className="maze-board"
          viewBox={`-0.1 -0.1 ${size + 0.2} ${size + 0.2}`}
          onPointerDown={e => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={e => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
            move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
          }}
        >
          <rect x={ex - 0.5} y={ey - 0.5} width="1" height="1" className="maze-exit" />
          <polyline className="maze-trail" points={state.trail.map(i => center(i).join(',')).join(' ')} />
          <path className="maze-walls" d={walls.join('')} />
          <circle className={`maze-ball ${lost ? 'crashed' : ''}`} cx={bx} cy={by} r="0.32" />
        </svg>
      </div>
      <div className="maze-pad">
        {ARROWS.map(([dir, glyph]) => (
          <button key={dir} className={`board-cell maze-arrow ${dir}`} disabled={state.phase !== 'playing'} onClick={() => move(dir)} aria-label={t(`maze.${dir}`)}>
            {glyph}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  const now = useClock(state.phase === 'playing', 500);
  return (
    <StatusLine items={[
      t('maze.mazeOf', { n: Math.min(state.index + 1, MAZE.mazes), total: MAZE.mazes }),
      `${t('game.time')}: ${Math.max(0, Math.floor((now - state.startedAt) / 1000))} ${t('game.seconds')}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  const m = outcome.metrics;
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metrics.completed')}</span><span className="stat-value">{m.completed} / {m.mazes}</span></div>
      {m.mazeTimeMs !== undefined && (
        <div className="stat-item"><span className="stat-label">{t('metrics.mazeTimeMs')}</span><span className="stat-value">{(m.mazeTimeMs / 1000).toFixed(1)} {t('game.seconds')}</span></div>
      )}
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const Maze: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  return <GameShell game={getGame('maze')} views={views} onBack={onBack} onNextGame={onNextGame} />;
};
