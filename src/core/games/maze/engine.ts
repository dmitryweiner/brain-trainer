// Maze: move the ball from the top-left corner to the exit, one cell per
// arrow or swipe (rolling to the next junction surprised players: one press
// moved the ball many cells). The way must be planned: hitting a wall loses
// the maze, the ball does not go back, so a dead end loses it too (players
// asked for both, 2026-10-09). Three mazes per session; the level sets the
// size (6×6…14×14).
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';

export const MAZE = {
  mazes: 3,
  mazeMs: 120_000,
  /**
   * Growing tree: carry on from the newest cell this often, else branch off
   * a random earlier one. Pure depth-first (1) made long corridors with few
   * forks, too easy (2026-10-09); 0.5 doubles the forks on the way out.
   */
  newestBias: 0.5,
  doneMs: 900,
} as const;

export type Dir = 'up' | 'right' | 'down' | 'left';

/** Open sides of a cell, as bits */
export const OPEN: Record<Dir, number> = { up: 1, right: 2, down: 4, left: 8 };
const DELTA: Record<Dir, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const OPPOSITE: Record<Dir, Dir> = { up: 'down', right: 'left', down: 'up', left: 'right' };
const DIRS: Dir[] = ['up', 'right', 'down', 'left'];

export interface Maze {
  size: number;
  /** open-side bits per cell, row-major */
  cells: number[];
}

export function mazeSize(level: number): number {
  return 6 + Math.round(((clampLevel(level) - 1) * 8) / 9);
}

/** A perfect maze (one path between any two cells), carved by a growing tree */
export function generateMaze(size: number, rng: Rng): Maze {
  const cells = Array(size * size).fill(0);
  const seen = new Set<number>([0]);
  const active = [0];
  while (active.length > 0) {
    const index = rng.next() < MAZE.newestBias ? active.length - 1 : rng.int(0, active.length - 1);
    const at = active[index];
    const x = at % size;
    const y = Math.floor(at / size);
    const options = DIRS.filter(d => {
      const nx = x + DELTA[d][0];
      const ny = y + DELTA[d][1];
      return nx >= 0 && ny >= 0 && nx < size && ny < size && !seen.has(ny * size + nx);
    });
    if (options.length === 0) {
      active.splice(index, 1);
      continue;
    }
    const d = rng.pick(options);
    const next = (y + DELTA[d][1]) * size + x + DELTA[d][0];
    cells[at] |= OPEN[d];
    cells[next] |= OPEN[OPPOSITE[d]];
    seen.add(next);
    active.push(next);
  }
  return { size, cells };
}

function step(maze: Maze, at: number, d: Dir): number | null {
  if (!(maze.cells[at] & OPEN[d])) return null;
  return at + DELTA[d][1] * maze.size + DELTA[d][0];
}

/** Cells on the shortest path from start to exit (BFS) */
export function shortestPath(maze: Maze): number {
  const exit = maze.size * maze.size - 1;
  const dist = new Map<number, number>([[0, 0]]);
  const queue = [0];
  while (queue.length > 0) {
    const at = queue.shift()!;
    if (at === exit) return dist.get(at)!;
    for (const d of DIRS) {
      const n = step(maze, at, d);
      if (n !== null && !dist.has(n)) {
        dist.set(n, dist.get(at)! + 1);
        queue.push(n);
      }
    }
  }
  return 0;
}

/** How a maze ended */
export type MazeEnding = 'exit' | 'wall' | 'deadEnd' | 'timeout';

export interface MazeRun {
  ending: MazeEnding;
  completed: boolean;
  cellsMoved: number;
  shortest: number;
  timeMs: number;
}

export interface MazeState {
  phase: 'playing' | 'solved' | 'done';
  level: number;
  maze: Maze;
  index: number;
  ball: number;
  /** cells visited this maze, in order (drawn as the trail) */
  trail: number[];
  cellsMoved: number;
  shortest: number;
  startedAt: number;
  runs: MazeRun[];
  until: number;
}

export type MazeEvent = { type: 'move'; dir: Dir } | { type: 'tick' } | { type: 'timeout'; index: number };

function start(state: MazeState, rng: Rng, now: number): MazeState {
  const maze = generateMaze(mazeSize(state.level), rng);
  return { ...state, phase: 'playing', maze, ball: 0, trail: [0], cellsMoved: 0, shortest: shortestPath(maze), startedAt: now };
}

function finish(state: MazeState, now: number, ending: MazeEnding): MazeState {
  const run: MazeRun = {
    ending, completed: ending === 'exit', cellsMoved: state.cellsMoved, shortest: state.shortest, timeMs: elapsed(now, state.startedAt),
  };
  return { ...state, phase: 'solved', runs: [...state.runs, run], until: now + MAZE.doneMs };
}

export const mazeEngine: GameEngine<MazeState, MazeEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const base: MazeState = {
      phase: 'playing', level: L, maze: { size: 0, cells: [] }, index: 0, ball: 0, trail: [], cellsMoved: 0,
      shortest: 0, startedAt: ctx.now, runs: [], until: 0,
    };
    return start(base, ctx.rng, ctx.now);
  },

  reduce(state, event, ctx) {
    const { now, rng } = ctx;
    if (event.type === 'tick') {
      if (state.phase !== 'solved') return state;
      const index = state.index + 1;
      return index >= MAZE.mazes ? { ...state, phase: 'done', index } : start({ ...state, index }, rng, now);
    }
    if (state.phase !== 'playing') return state;
    if (event.type === 'timeout') return event.index === state.index ? finish(state, now, 'timeout') : state;
    const ball = step(state.maze, state.ball, event.dir);
    if (ball === null) return finish(state, now, 'wall');
    const from = state.trail[state.trail.length - 2];
    if (ball === from) return state;
    const next = { ...state, ball, trail: [...state.trail, ball], cellsMoved: state.cellsMoved + 1 };
    if (ball === state.maze.size * state.maze.size - 1) return finish(next, now, 'exit');
    const onward = DIRS.filter(d => step(state.maze, ball, d) !== null && step(state.maze, ball, d) !== state.ball);
    return onward.length === 0 ? finish(next, now, 'deadEnd') : next;
  },

  timers(state): TimerRequest<MazeEvent>[] {
    if (state.phase === 'playing') {
      return [{ id: `timeout-${state.index}`, at: state.startedAt + MAZE.mazeMs, event: { type: 'timeout', index: state.index } }];
    }
    return state.phase === 'solved' ? [{ id: `next-${state.index}`, at: state.until, event: { type: 'tick' } }] : [];
  },

  cues: counterCues<MazeState>(s => s.runs.filter(r => r.completed).length, s => s.runs.filter(r => !r.completed).length, s => s.cellsMoved),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const done = state.runs.filter(r => r.completed);
    // without going back every finished path is the shortest one
    const shortest = done.reduce((a, r) => a + r.shortest, 0);
    const time = done.reduce((a, r) => a + r.timeMs, 0);
    return {
      score: shortest,
      accuracy: percent(done.length, state.runs.length),
      avgTimeMs: shortest > 0 ? Math.round(time / shortest) : 0,
      metrics: {
        completed: done.length,
        mazes: state.runs.length,
        size: state.maze.size,
        crashes: state.runs.filter(r => r.ending === 'wall').length,
        deadEnds: state.runs.filter(r => r.ending === 'deadEnd').length,
        ...(done.length > 0 ? { mazeTimeMs: Math.round(time / done.length) } : {}),
      },
    };
  },
};

/** Mazes finished × speed per cell (≤0.35 s full, ≥1.5 s 60%) × the level's ceiling */
export function mazeRating(outcome: SessionOutcome, level: number): number {
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 350, 1500, 0.6) * levelCeiling(level);
}
