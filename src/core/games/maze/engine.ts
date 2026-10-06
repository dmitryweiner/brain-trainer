// Maze: roll the ball from the top-left corner to the exit. A swipe or an
// arrow rolls it until a wall or a junction. Three mazes per session; the
// level sets the size (5×5…12×12).
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import type { Rng } from '../../rng';
import { clampLevel, counterCues, elapsed, levelCeiling, speedFactor } from '../common';

export const MAZE = {
  mazes: 3,
  mazeMs: 120_000,
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
  return 5 + Math.round(((clampLevel(level) - 1) * 7) / 9);
}

/** A perfect maze (one path between any two cells) by depth-first carving */
export function generateMaze(size: number, rng: Rng): Maze {
  const cells = Array(size * size).fill(0);
  const seen = new Set<number>([0]);
  const stack = [0];
  while (stack.length > 0) {
    const at = stack[stack.length - 1];
    const x = at % size;
    const y = Math.floor(at / size);
    const options = DIRS.filter(d => {
      const nx = x + DELTA[d][0];
      const ny = y + DELTA[d][1];
      return nx >= 0 && ny >= 0 && nx < size && ny < size && !seen.has(ny * size + nx);
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const d = rng.pick(options);
    const next = (y + DELTA[d][1]) * size + x + DELTA[d][0];
    cells[at] |= OPEN[d];
    cells[next] |= OPEN[OPPOSITE[d]];
    seen.add(next);
    stack.push(next);
  }
  return { size, cells };
}

function step(maze: Maze, at: number, d: Dir): number | null {
  if (!(maze.cells[at] & OPEN[d])) return null;
  return at + DELTA[d][1] * maze.size + DELTA[d][0];
}

function openCount(bits: number): number {
  return DIRS.filter(d => bits & OPEN[d]).length;
}

/** Cells passed when rolling from `at` towards `d`: stops at walls, junctions and the exit */
export function roll(maze: Maze, at: number, d: Dir): number[] {
  const path: number[] = [];
  const exit = maze.size * maze.size - 1;
  let cur = at;
  for (;;) {
    const next = step(maze, cur, d);
    if (next === null) break;
    path.push(next);
    cur = next;
    if (cur === exit || openCount(maze.cells[cur]) !== 2) break;
    // in a corridor that bends, follow the bend
    if (!(maze.cells[cur] & OPEN[d])) {
      const turn = DIRS.find(o => o !== OPPOSITE[d] && maze.cells[cur] & OPEN[o])!;
      d = turn;
    }
  }
  return path;
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

export interface MazeRun {
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

function finish(state: MazeState, now: number, completed: boolean): MazeState {
  const run: MazeRun = { completed, cellsMoved: state.cellsMoved, shortest: state.shortest, timeMs: elapsed(now, state.startedAt) };
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
    if (event.type === 'timeout') return event.index === state.index ? finish(state, now, false) : state;
    const path = roll(state.maze, state.ball, event.dir);
    if (path.length === 0) return state;
    const ball = path[path.length - 1];
    const next = { ...state, ball, trail: [...state.trail, ...path], cellsMoved: state.cellsMoved + path.length };
    return ball === state.maze.size * state.maze.size - 1 ? finish(next, now, true) : next;
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
    const moved = done.reduce((a, r) => a + r.cellsMoved, 0);
    const shortest = done.reduce((a, r) => a + r.shortest, 0);
    const time = done.reduce((a, r) => a + r.timeMs, 0);
    // efficiency over finished mazes; unfinished ones count as zero
    const efficiency = moved > 0 ? (shortest / moved) * (done.length / Math.max(1, state.runs.length)) : 0;
    return {
      score: done.reduce((a, r) => a + r.shortest, 0),
      accuracy: Math.min(100, Math.round(efficiency * 100)),
      avgTimeMs: shortest > 0 ? Math.round(time / shortest) : 0,
      metrics: {
        completed: done.length,
        mazes: state.runs.length,
        size: state.maze.size,
        extraCells: moved - shortest,
        ...(done.length > 0 ? { mazeTimeMs: Math.round(time / done.length) } : {}),
      },
    };
  },
};

/** Path economy × speed per cell (≤0.35 s full, ≥1.5 s 60%) × the level's ceiling */
export function mazeRating(outcome: SessionOutcome, level: number): number {
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 350, 1500, 0.6) * levelCeiling(level);
}
