import { describe, it, expect } from 'vitest';
import { createRng } from '../rng';
import { SCHEMA_VERSION, type EngineContext, type GameEngine, type GameId, type GameSession } from '../types';
import { EngineRunner } from '../engine/runner';
import { FakeScheduler } from '../testing/fakeScheduler';
import { GAMES } from './registry';
import { currentQuestion, whereLayout, whereWasEngine, WHERE_WAS } from './whereWas/engine';
import { makeMirrorRound, mirrorEngine } from './mirror/engine';
import { generateMaze, mazeEngine, mazeSize, OPEN, shortestPath, type Dir } from './maze/engine';
import { fitLayout, makeFitRound } from './fitPiece/engine';
import { mirror, sameUpToRotation, normalize } from './shapes/polyomino';
import { oddOneOutEngine } from './oddOneOut/engine';
import { dayKey } from '../stats';
import { achievements, dailyWorkout, workoutDays, workoutProgress, workoutStreak } from '../stats/engagement';

const ctx = (now: number, seed = 1): EngineContext => ({ now, rng: createRng(seed) });

function play<S, E>(engine: GameEngine<S, E>, level: number, act: (s: S, r: EngineRunner<S, E>) => void, seed = 3) {
  const clock = new FakeScheduler();
  let outcome = null as null | ReturnType<GameEngine<S, E>['result']>;
  const runner = new EngineRunner(engine, clock, { level, seed, onFinish: o => (outcome = o) });
  for (let i = 0; i < 20000 && !outcome; i++) {
    act(runner.state, runner);
    clock.advance(50);
  }
  return { outcome: outcome!, runner };
}

describe('Where was it', () => {
  it('fits the objects into the grid at every level', () => {
    for (let L = 1; L <= 10; L++) {
      const { size, items } = whereLayout(L);
      expect(items).toBeLessThan(size * size);
      expect(items).toBeGreaterThanOrEqual(3);
    }
  });

  it('asks about every object of every board', () => {
    let asked = 0;
    const { outcome } = play(whereWasEngine, 5, (s, r) => {
      const q = currentQuestion(s);
      if (s.phase === 'asking' && q) {
        asked++;
        r.dispatch({ type: 'pick', cell: q.cell });
      }
    });
    expect(asked).toBe(WHERE_WAS.boards * whereLayout(5).items);
    expect(outcome.accuracy).toBe(100);
  });

  it('ignores picks while the objects are still shown', () => {
    const s = whereWasEngine.init(1, ctx(0));
    expect(whereWasEngine.reduce(s, { type: 'pick', cell: s.placed[0].cell }, ctx(10))).toBe(s);
  });
});

describe('Mirror', () => {
  it('has exactly one mirror image among the options', () => {
    for (let L = 1; L <= 10; L++) {
      const rng = createRng(L);
      for (let i = 0; i < 10; i++) {
        const r = makeMirrorRound(L, rng);
        const images = r.options.filter(o => sameUpToRotation(o, mirror(r.target)));
        expect(images).toHaveLength(1);
        expect(r.options[r.answer]).toBe(images[0]);
      }
    }
  });

  it('shows a plain flip at low levels', () => {
    const r = makeMirrorRound(1, createRng(4));
    const key = (s: readonly (readonly [number, number])[]) => JSON.stringify(normalize(s));
    expect(key(r.options[r.answer])).toBe(key(mirror(r.target)));
  });

  it('plays a session', () => {
    const { outcome } = play(mirrorEngine, 6, (s, r) => s.phase === 'playing' && r.dispatch({ type: 'pick', index: s.current.answer }));
    expect(outcome.accuracy).toBe(100);
  });
});

describe('Maze', () => {
  it('grows from 5×5 to 12×12', () => {
    expect([1, 10].map(mazeSize)).toEqual([5, 12]);
  });

  it('is a perfect maze: every cell reachable, walls consistent', () => {
    const maze = generateMaze(8, createRng(2));
    const n = maze.size;
    for (let i = 0; i < n * n; i++) {
      const x = i % n;
      if (maze.cells[i] & OPEN.right) expect(x < n - 1 && maze.cells[i + 1] & OPEN.left).toBeTruthy();
      if (maze.cells[i] & OPEN.down) expect(maze.cells[i + n] & OPEN.up).toBeTruthy();
    }
    // a tree on n² cells has n² − 1 passages
    const passages = maze.cells.reduce((a, c) => a + ((c & OPEN.right ? 1 : 0) + (c & OPEN.down ? 1 : 0)), 0);
    expect(passages).toBe(n * n - 1);
    expect(shortestPath(maze)).toBeGreaterThanOrEqual(2 * (n - 1));
  });

  it('moves one cell per press and stops at walls', () => {
    let st = mazeEngine.init(1, ctx(0, 5));
    for (const d of ['up', 'right', 'down', 'left'] as Dir[]) {
      const next = mazeEngine.reduce(st, { type: 'move', dir: d }, ctx(1));
      if (st.maze.cells[0] & OPEN[d]) {
        expect(next.cellsMoved).toBe(1);
        expect(next.trail).toEqual([0, next.ball]);
        st = next;
        break;
      }
      expect(next).toBe(st);
    }
    expect(st.cellsMoved).toBe(1);
  });

  it('a solver following the shortest path scores full efficiency', () => {
    const { outcome } = play(mazeEngine, 3, (s, r) => {
      if (s.phase !== 'playing') return;
      // BFS from the ball, then roll towards the next cell on the way to the exit
      const { size, cells } = s.maze;
      const exit = size * size - 1;
      const prev = new Map<number, number>([[s.ball, -1]]);
      const queue = [s.ball];
      const dirs: [Dir, number][] = [['up', -size], ['right', 1], ['down', size], ['left', -1]];
      while (queue.length) {
        const at = queue.shift()!;
        for (const [d, delta] of dirs) {
          if (cells[at] & OPEN[d] && !prev.has(at + delta)) {
            prev.set(at + delta, at);
            queue.push(at + delta);
          }
        }
      }
      let step = exit;
      while (prev.get(step) !== s.ball) step = prev.get(step)!;
      const dir = dirs.find(([, delta]) => s.ball + delta === step)![0];
      r.dispatch({ type: 'move', dir });
    });
    expect(outcome.metrics).toMatchObject({ completed: 3, mazes: 3, extraCells: 0 });
    expect(outcome.accuracy).toBe(100);
  });
});

describe('Fit the piece', () => {
  it('cuts a hole inside the board and offers exactly one piece that fills it', () => {
    for (let L = 1; L <= 10; L++) {
      const rng = createRng(L * 7);
      for (let i = 0; i < 15; i++) {
        const r = makeFitRound(L, rng);
        const { board, cells } = fitLayout(L);
        expect(r.hole).toHaveLength(cells);
        for (const [x, y] of r.hole) {
          expect(x).toBeLessThan(board);
          expect(y).toBeLessThan(board);
        }
        expect(r.options.filter(o => sameUpToRotation(o, r.hole))).toHaveLength(1);
        expect(sameUpToRotation(r.options[r.answer], r.hole)).toBe(true);
      }
    }
  });
});

describe('cues', () => {
  it('sound good on a correct answer and bad on a wrong one', () => {
    const s = oddOneOutEngine.init(1, ctx(0));
    const right = oddOneOutEngine.reduce(s, { type: 'pick', index: s.oddIndex }, ctx(10));
    const wrong = oddOneOutEngine.reduce(s, { type: 'pick', index: (s.oddIndex + 1) % s.grid.length }, ctx(10));
    expect(oddOneOutEngine.cues!(s, right)).toEqual(['good']);
    expect(oddOneOutEngine.cues!(s, wrong)).toEqual(['bad']);
  });

  it('every game has cues', () => {
    for (const g of GAMES) expect(g.engine?.cues, g.id).toBeTypeOf('function');
  });
});

let n = 0;
const day = (d: number, h = 12) => new Date(2026, 9, d, h).getTime();
function s(gameId: GameId, startedAt: number, over: Partial<GameSession> = {}): GameSession {
  n++;
  return {
    id: `e${n}`, gameId, schemaVersion: SCHEMA_VERSION, startedAt, durationMs: 1000, level: 1, score: 1, rating: 300,
    accuracy: 80, avgTimeMs: 0, metrics: {}, ...over,
  };
}
/** One game per workout slot on that day */
const fullDay = (d: number) => [s('memory-matrix', day(d, 9)), s('schulte', day(d, 10)), s('whack-a-mole', day(d, 11)), s('maze', day(d, 12))];

describe('daily workout', () => {
  it('is the same for everyone on a day, one game per slot, and changes from day to day', () => {
    const a = dailyWorkout('2026-10-06', GAMES);
    expect(dailyWorkout('2026-10-06', GAMES)).toEqual(a);
    expect(a).toHaveLength(4);
    const cat = (id: GameId) => GAMES.find(g => g.id === id)!.category;
    expect(cat(a[0])).toBe('memory');
    expect(cat(a[1])).toBe('attention');
    expect(cat(a[2])).toBe('reaction');
    expect(['spatial', 'knowledge']).toContain(cat(a[3]));
    const week = Array.from({ length: 7 }, (_, i) => dailyWorkout(`2026-10-${10 + i}`, GAMES).join());
    expect(new Set(week).size).toBeGreaterThan(1);
  });

  it('counts a slot done by any game of its category', () => {
    const p = workoutProgress([s('n-back', day(6)), s('flags-game', day(6))], '2026-10-06', GAMES);
    expect(p.games.map(g => g.done)).toEqual([true, false, false, true]);
    expect(p).toMatchObject({ done: 2, complete: false });
    expect(workoutProgress(fullDay(6), '2026-10-06', GAMES).complete).toBe(true);
  });

  it('keeps a streak until tonight and breaks it after a missed day', () => {
    const sessions = [...fullDay(3), ...fullDay(4), ...fullDay(5)];
    expect([...workoutDays(sessions, GAMES)].sort()).toEqual(['2026-10-03', '2026-10-04', '2026-10-05']);
    expect(workoutStreak(sessions, GAMES, day(5, 20))).toBe(3);
    expect(workoutStreak(sessions, GAMES, day(6, 9))).toBe(3);
    expect(workoutStreak(sessions, GAMES, day(7, 9))).toBe(0);
    expect(workoutStreak([...sessions, ...fullDay(7)], GAMES, day(7, 20))).toBe(1);
  });
});

describe('achievements', () => {
  it('notes when and by which session each one was earned', () => {
    const sessions = [...fullDay(1), ...fullDay(2), ...fullDay(3)];
    const list = achievements(sessions, GAMES);
    const get = (id: string) => list.find(a => a.id === id)!;
    expect(get('first-game')).toMatchObject({ sessionId: sessions[0].id });
    expect(get('first-workout')).toMatchObject({ sessionId: sessions[3].id, at: day(1, 12) });
    expect(get('streak-3')).toMatchObject({ sessionId: sessions[11].id });
    expect(get('streak-7').at).toBeUndefined();
    expect(get('streak-7').progress).toEqual([3, 7]);
    expect(get('explorer').progress).toEqual([4, GAMES.length]);
  });

  it('level, rating and all-categories achievements', () => {
    const list = achievements([
      s('odd-one-out', day(1, 9), { level: 10, rating: 950 }),
      s('reaction-click', day(1, 10)), s('memory-flip', day(1, 11)), s('maze', day(1, 12)), s('flags-game', day(1, 13)),
    ], GAMES);
    const ids = list.filter(a => a.at !== undefined).map(a => a.id);
    expect(ids).toEqual(expect.arrayContaining(['level-5', 'level-10', 'rating-900', 'all-categories', 'first-workout']));
    expect(dayKey(list.find(a => a.id === 'all-categories')!.at!)).toBe('2026-10-01');
  });
});
