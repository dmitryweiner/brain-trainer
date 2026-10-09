import { describe, it, expect } from 'vitest';
import { createRng } from '../rng';
import type { EngineContext, GameEngine } from '../types';
import { EngineRunner } from '../engine/runner';
import { FakeScheduler } from '../testing/fakeScheduler';
import { levelCeiling } from './common';
import { normalizeSession, GAMES } from './registry';
import { matrixLayout, memoryMatrixEngine, MEMORY_MATRIX } from './memoryMatrix/engine';
import { schulteEngine, schulteLayout, schulteSequence, schulteRating } from './schulte/engine';
import { whackEngine, whackLayout, WHACK } from './whackAMole/engine';
import { corridor, gridSpacing, makePath, pointAt, project } from './traceLine/geometry';
import { traceEngine, TRACE } from './traceLine/engine';
import { isChiral, key, mirror, nearMiss, randomChiral, rotate, sameUpToRotation } from './shapes/polyomino';
import { makeTurnedFitRound, rotateShapeEngine } from './rotateShape/engine';
import { fitLayout } from './fitPiece/engine';
import { litPanel, sequenceEngine, sequenceLayout, sequenceLevelStep, sequenceRating, sequenceSessionLevel, SEQUENCE } from './sequenceRecall/engine';
import { digitSpanEngine, digitSpanRating, expected, shownDigit, DIGIT_SPAN } from './digitSpan/engine';
import { correctSide, switchLayout, taskSwitchEngine, SWITCH } from './taskSwitch/engine';
import { boardsFor, memoryFlipEngine } from './memoryFlip/engine';
import { emojiHuntEngine, huntRound } from './emojiHunt/engine';
import { makeGeoEngine, makeQuestion, optionCount, timeBonus, type GeoKind } from './geoQuiz/engine';
import { CAPITAL_COUNTRIES, CONTINENT_OF } from './geoQuiz/data';
import { CURRENCY_CONFLICTS, CURRENCY_OF } from './geoQuiz/facts';
import type { SupportedCountryCode } from './flags/data';
import { isTarget, nBackEngine, nBackLayout, nBackRating, nBackSequence } from './nBack/engine';

const ctx = (now: number, seed = 1): EngineContext => ({ now, rng: createRng(seed) });

/** Runs an engine on a fake clock; `act` answers whatever the state asks */
function play<S, E>(engine: GameEngine<S, E>, level: number, act: (s: S, r: EngineRunner<S, E>, clock: FakeScheduler) => void, seed = 3) {
  const clock = new FakeScheduler();
  let outcome = null as null | ReturnType<GameEngine<S, E>['result']>;
  const runner = new EngineRunner(engine, clock, { level, seed, onFinish: o => (outcome = o) });
  for (let i = 0; i < 5000 && !outcome; i++) {
    act(runner.state, runner, clock);
    clock.advance(50);
  }
  return { outcome: outcome!, runner };
}

describe('every registered game', () => {
  it('has an engine, a rating and levels', () => {
    for (const g of GAMES) {
      expect(g.engine, g.id).toBeDefined();
      expect(g.maxLevel).toBeGreaterThanOrEqual(g.minLevel);
    }
    expect(GAMES.map(g => g.category)).toContain('spatial');
  });
});

describe('Memory Matrix', () => {
  it('scales grid, cells and show time with the level', () => {
    expect(matrixLayout(1)).toEqual({ gridSize: 3, cells: 3, showMs: 1600 });
    expect(matrixLayout(10)).toEqual({ gridSize: 6, cells: 12, showMs: 880 });
    for (let L = 1; L <= 10; L++) {
      const { gridSize, cells } = matrixLayout(L);
      expect(cells).toBeLessThanOrEqual((gridSize * gridSize) / 2);
    }
  });

  it('ignores taps before the pattern hides, and plays a perfect session', () => {
    const { outcome } = play(memoryMatrixEngine, 4, (s, r) => {
      if (s.phase === 'showing') r.dispatch({ type: 'tap', cell: s.pattern[0] });
      if (s.phase === 'input') r.dispatch({ type: 'tap', cell: s.pattern.find(c => !s.taps.includes(c))! });
    });
    expect(outcome.accuracy).toBe(100);
    expect(outcome.metrics).toMatchObject({ perfectRounds: MEMORY_MATRIX.rounds, cells: matrixLayout(4).cells });
  });

  it('ends a round after as many taps as cells', () => {
    let s = memoryMatrixEngine.init(1, ctx(0));
    s = memoryMatrixEngine.reduce(memoryMatrixEngine.reduce(s, { type: 'next' }, ctx(1)), { type: 'next' }, ctx(2));
    const wrong = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(c => !s.pattern.includes(c));
    for (const c of wrong.slice(0, 3)) s = memoryMatrixEngine.reduce(s, { type: 'tap', cell: c }, ctx(3));
    expect(s.phase).toBe('feedback');
    expect(s.lastPerfect).toBe(false);
  });
});

describe('Schulte', () => {
  it('grows the table, then goes red-black', () => {
    expect([1, 3, 6, 8].map(l => schulteLayout(l))).toEqual([
      { size: 4, redBlack: false }, { size: 5, redBlack: false }, { size: 6, redBlack: false }, { size: 5, redBlack: true },
    ]);
  });

  it('alternates black up and red down', () => {
    const seq = schulteSequence({ size: 5, redBlack: true });
    expect(seq.slice(0, 4)).toEqual([
      { value: 1, color: 'black' }, { value: 12, color: 'red' }, { value: 2, color: 'black' }, { value: 11, color: 'red' },
    ]);
    expect(seq).toHaveLength(25);
    expect(seq[24]).toEqual({ value: 13, color: 'black' });
  });

  it('counts wrong taps and finishes with the last cell', () => {
    let s = schulteEngine.init(1, ctx(0));
    const indexOf = (v: number) => s.cells.findIndex(c => c.value === v);
    s = schulteEngine.reduce(s, { type: 'tap', index: indexOf(2) }, ctx(100));
    expect(s.errors).toBe(1);
    for (let v = 1; v <= 16; v++) s = schulteEngine.reduce(s, { type: 'tap', index: indexOf(v) }, ctx(100 * v));
    expect(s.phase).toBe('done');
    const outcome = schulteEngine.result(s);
    expect(outcome).toMatchObject({ score: 16, accuracy: 94, metrics: { tableMs: 1600, completed: 1, errors: 1 } });
    expect(schulteRating(outcome, 1)).toBeCloseTo(0.94 * levelCeiling(1));
  });
});

describe('Whack-a-mole', () => {
  it('adds bombs, speed and simultaneous moles with the level', () => {
    expect(whackLayout(1)).toMatchObject({ gridSize: 3, bombChance: 0, maxActive: 1, lifetimeMs: 1300 });
    expect(whackLayout(10)).toMatchObject({ gridSize: 4, maxActive: 3, lifetimeMs: 580 });
    expect(whackLayout(10).bombChance).toBeCloseTo(0.32);
  });

  it('a perfect player lasts the full minute and never loses a life', () => {
    const { outcome } = play(whackEngine, 5, (s, r) => {
      s.holes.forEach((p, hole) => p?.kind === 'mole' && r.dispatch({ type: 'tap', hole }));
    });
    expect(outcome.metrics).toMatchObject({ livesLeft: WHACK.lives, misses: 0, bombHits: 0 });
    expect(outcome.metrics.hits).toBeGreaterThan(20);
    expect(outcome.score).toBeGreaterThan(outcome.metrics.hits); // combo bonus
  });

  it('three misses end the game early', () => {
    const { outcome, runner } = play(whackEngine, 1, () => undefined);
    expect(outcome.metrics).toMatchObject({ livesLeft: 0, misses: 3 });
    expect(runner.state.endsAt).toBeLessThan(WHACK.sessionMs);
  });
});

describe('Trace the line', () => {
  it('builds waves, zigzags and maze-like grid routes inside the box, and narrows the corridor', () => {
    const rng = createRng(4);
    expect([1, 2, 5].map(l => makePath(l, rng).kind)).toEqual(['wave', 'zigzag', 'grid']);
    // the corridor never spans two neighbouring lines of a grid route
    for (let L = 3; L <= 10; L++) expect(corridor(L) * 2).toBeLessThan(gridSpacing(L));
    // grid routes wind through most of the grid
    expect(makePath(10, rng).length).toBeGreaterThan(300);
    for (let L = 1; L <= 10; L++) {
      for (const p of makePath(L, rng).points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(100);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(100);
      }
    }
    expect(corridor(10)).toBeLessThan(corridor(1));
  });

  it('projects onto the path and measures along it', () => {
    const path = makePath(4, createRng(1));
    const mid = pointAt(path, path.length / 2);
    const p = project(path, { x: mid.x + 1, y: mid.y });
    expect(p.dist).toBeLessThanOrEqual(1.01);
    expect(p.along).toBeCloseTo(path.length / 2, 0);
  });

  it('completes a curve traced exactly, and does not count shortcuts across a spiral', () => {
    let s = traceEngine.init(8, ctx(0));
    const start = s.path.points[0];
    s = traceEngine.reduce(s, { type: 'down', ...start }, ctx(10));
    // jump to the far end: outside the look-ahead window, so no progress
    const end = s.path.points[s.path.points.length - 1];
    s = traceEngine.reduce(s, { type: 'move', ...end }, ctx(20));
    expect(s.progress).toBeLessThan(TRACE.lookahead);
    for (let a = 0; s.phase === 'playing' && a <= s.path.length; a += 1) {
      s = traceEngine.reduce(s, { type: 'move', ...pointAt(s.path, a) }, ctx(30 + a));
    }
    expect(s.phase).toBe('feedback');
    expect(s.results[0].completed).toBe(true);
  });

  it('a curve not finished in time counts as incomplete', () => {
    const { outcome } = play(traceEngine, 1, () => undefined);
    expect(outcome.metrics).toMatchObject({ completed: 0, rounds: TRACE.rounds });
  });
});

describe('polyominoes', () => {
  it('rotates, mirrors and compares up to rotation', () => {
    const L = [[0, 0], [0, 1], [0, 2], [1, 2]] as const;
    expect(key(rotate(L, 4))).toBe(key(L));
    expect(sameUpToRotation(rotate(L, 1), L)).toBe(true);
    expect(isChiral(L)).toBe(true);
    expect(isChiral([[0, 0], [1, 0], [0, 1], [1, 1]])).toBe(false);
    expect(sameUpToRotation(mirror(L), L)).toBe(false);
  });

  it('generates chiral shapes and near misses that are really different', () => {
    const rng = createRng(11);
    for (let i = 0; i < 30; i++) {
      const s = randomChiral(5, rng);
      expect(s).toHaveLength(5);
      expect(isChiral(s)).toBe(true);
      const near = nearMiss(s, rng);
      if (near) {
        expect(near).toHaveLength(5);
        expect(sameUpToRotation(near, s) || sameUpToRotation(near, mirror(s))).toBe(false);
      }
    }
  });
});

describe('Fit the shape (rotate-shape)', () => {
  it('exactly one piece fills the hole, and it is shown turned', () => {
    for (let level = 1; level <= 10; level++) {
      const rng = createRng(level);
      for (let i = 0; i < 10; i++) {
        const round = makeTurnedFitRound(level, rng);
        const matches = round.options.filter(o => sameUpToRotation(o, round.hole));
        expect(matches).toHaveLength(1);
        expect(round.options[round.answer]).toBe(matches[0]);
        expect(round.options.every(o => o.length === fitLayout(level).cells)).toBe(true);
        const symmetric = [1, 2, 3].every(k => key(rotate(round.hole, k)) === key(round.hole));
        if (!symmetric) expect(key(round.options[round.answer])).not.toBe(key(round.hole));
      }
    }
  });

  it('scores correct picks', () => {
    let s = rotateShapeEngine.init(2, ctx(0));
    s = rotateShapeEngine.reduce(s, { type: 'pick', index: s.current.answer }, ctx(2000));
    expect(s.score).toBe(4);
    expect(s.answers).toEqual([{ correct: true, timeMs: 2000 }]);
  });
});

describe('Repeat (Simon)', () => {
  it('sets length, panels and pace by level', () => {
    expect(sequenceLayout(1)).toMatchObject({ panels: 4, length: 3, showMs: 750 });
    expect(sequenceLayout(6)).toMatchObject({ panels: 4, length: 8 });
    expect(sequenceLayout(7)).toMatchObject({ panels: 6, length: 9 });
    expect(sequenceLayout(10)).toMatchObject({ panels: 9, length: 12, showMs: 390 });
  });

  /** Plays one game: `wrongTries` tries fail at their second step, then the rest are repeated */
  const game = (level: number, wrongTries: number) => {
    const lengths: number[] = [];
    let tries = 0;
    return {
      lengths,
      ...play(sequenceEngine, level, (s, r) => {
        if (s.phase !== 'input') return;
        if (s.inputIndex === 0) { lengths.push(s.sequence.length); tries++; }
        const wrong = tries <= wrongTries && s.inputIndex === 1;
        r.dispatch({ type: 'tap', panel: wrong ? (s.sequence[1] + 1) % s.layout.panels : s.sequence[s.inputIndex] });
      }),
    };
  };
  const step = (outcome: { metrics: Record<string, number> }) => sequenceLevelStep(outcome);

  it('one length per game: a first-try win ends it and the next game is longer', () => {
    const { outcome, lengths } = game(3, 0);
    expect(lengths).toEqual([5]);
    expect(outcome.metrics).toMatchObject({ won: 1, tries: 1, length: 5, maxSequence: 5 });
    expect(outcome.score).toBe(10);
    expect(step(outcome)).toBe(1);
  });

  it('a miss gets a second try at the same length; winning it keeps the length', () => {
    const { outcome, lengths } = game(3, 1);
    expect(lengths).toEqual([5, 5]);
    expect(outcome.metrics).toMatchObject({ won: 1, tries: 2 });
    expect(step(outcome)).toBe(0);
  });

  it('two misses lose the game and the next one is shorter', () => {
    const { outcome, lengths } = game(3, SEQUENCE.lives);
    expect(lengths).toEqual([5, 5]);
    expect(outcome.metrics).toMatchObject({ won: 0, tries: 2, maxSequence: 1 });
    expect(outcome.accuracy).toBe(0);
    expect(step(outcome)).toBe(-1);
  });

  it('history of the growing version: replays the length reached', () => {
    const old = { level: 2, metrics: { maxSequence: 6, rounds: 5, panels: 4 } };
    expect(sequenceLevelStep(old)).toBe(0);
    expect(sequenceSessionLevel(old)).toBe(4);
    expect(sequenceLevelStep({ metrics: {} })).toBeUndefined();
  });

  it('shows each panel lit, then dark', () => {
    let s = sequenceEngine.init(1, ctx(0));
    expect(litPanel(s)).toBeNull();
    s = sequenceEngine.reduce(s, { type: 'tick' }, ctx(700));
    expect(litPanel(s)).toBe(s.sequence[0]);
    s = sequenceEngine.reduce(s, { type: 'tick' }, ctx(1450));
    expect(litPanel(s)).toBeNull();
  });

  it('rates by the longest sequence and fewer panels count less', () => {
    expect(sequenceRating({ score: 0, accuracy: 0, avgTimeMs: 0, metrics: { maxSequence: 12, panels: 9 } })).toBe(1000);
    expect(sequenceRating({ score: 0, accuracy: 0, avgTimeMs: 0, metrics: { maxSequence: 12, panels: 4 } })).toBe(800);
    expect(sequenceRating({ score: 18, accuracy: 0, avgTimeMs: 0, metrics: {} })).toBeCloseTo(320);
  });
});

describe('Digit span', () => {
  it('shows digits one by one and checks the typed answer, backwards on odd trials from level 4', () => {
    let s = digitSpanEngine.init(4, ctx(0));
    expect(s.backward).toBe(true);
    let t = 0;
    const toInput = () => {
      while (s.phase === 'showing') s = digitSpanEngine.reduce(s, { type: 'tick' }, ctx((t += 500)));
    };
    toInput();
    expect(s.direction).toBe('forward');
    for (const d of expected(s)) s = digitSpanEngine.reduce(s, { type: 'digit', digit: d }, ctx(t));
    expect(s.trials[0]).toMatchObject({ correct: true, direction: 'forward', length: 4 });
    s = digitSpanEngine.reduce(s, { type: 'tick' }, ctx((t += 2000)));
    expect(s.direction).toBe('backward');
    expect(s.digits).toHaveLength(3);
    s = digitSpanEngine.reduce(s, { type: 'tick' }, ctx((t += 700)));
    expect(shownDigit(s)).toBe(s.digits[0]);
  });

  it('adapts the length within 3…12', () => {
    const { outcome } = play(digitSpanEngine, 1, (s, r) => {
      if (s.phase === 'input') expected(s).slice(s.input.length).forEach(d => r.dispatch({ type: 'digit', digit: d }));
    });
    expect(outcome.metrics).toMatchObject({ correct: DIGIT_SPAN.trials, maxForward: 3 + DIGIT_SPAN.trials - 1 });
    expect(digitSpanRating(outcome)).toBeCloseTo(((10 - 2) / 9) * 1000);
  });
});

describe('Switch', () => {
  it('adds the Stroop rule at level 3 and drops the warning after 5', () => {
    expect(switchLayout(1)).toMatchObject({ rules: ['shape', 'color'], warn: true, limitMs: 2600 });
    expect(switchLayout(3).rules).toContain('ink');
    expect(switchLayout(6).warn).toBe(false);
  });

  it('answers by shape, colour or ink', () => {
    const figure = { kind: 'figure' as const, shape: 'square' as const, color: 'green' as const, word: 'green' as const };
    expect(correctSide('shape', figure)).toBe('right');
    expect(correctSide('color', figure)).toBe('left');
    expect(correctSide('ink', { kind: 'word', shape: 'circle', color: 'red', word: 'green' })).toBe('right');
  });

  it('a perfect player finishes all trials; timeouts cost lives', () => {
    const good = play(taskSwitchEngine, 4, (s, r) => {
      if (s.phase === 'stimulus') r.dispatch({ type: 'answer', side: correctSide(s.rule, s.stimulus) });
    });
    expect(good.outcome.metrics).toMatchObject({ trials: SWITCH.trials, livesLeft: SWITCH.lives, errors: 0 });
    const idle = play(taskSwitchEngine, 1, () => undefined);
    expect(idle.outcome.metrics).toMatchObject({ trials: SWITCH.lives, timeouts: SWITCH.lives, livesLeft: 0 });
  });
});

describe('Memory Flip', () => {
  it('moves the board window with the level', () => {
    expect(boardsFor(1).map(b => b.rows * b.cols)).toEqual([6, 12, 16]);
    expect(boardsFor(10).map(b => b.rows * b.cols)).toEqual([16, 20, 30]);
  });

  it('flips back a mismatch and clears matched pairs', () => {
    let s = memoryFlipEngine.init(1, ctx(0));
    const a = 0;
    const same = s.cards.findIndex((c, i) => i !== a && c.emoji === s.cards[a].emoji);
    const other = s.cards.findIndex(c => c.emoji !== s.cards[a].emoji);
    s = memoryFlipEngine.reduce(memoryFlipEngine.reduce(s, { type: 'flip', index: a }, ctx(1)), { type: 'flip', index: other }, ctx(2));
    expect(s.phase).toBe('mismatch');
    s = memoryFlipEngine.reduce(s, { type: 'tick' }, ctx(900));
    expect(s.open).toEqual([]);
    s = memoryFlipEngine.reduce(memoryFlipEngine.reduce(s, { type: 'flip', index: a }, ctx(1000)), { type: 'flip', index: same }, ctx(1001));
    expect(s.cards[a].matched && s.cards[same].matched).toBe(true);
    expect(s.moves).toBe(2);
  });

  it('a perfect memory plays three boards at full efficiency', () => {
    const { outcome } = play(memoryFlipEngine, 1, (s, r) => {
      if (s.phase !== 'playing') return;
      const i = s.cards.findIndex(c => !c.matched);
      const j = s.cards.findIndex((c, k) => k !== i && !c.matched && c.emoji === s.cards[i].emoji);
      r.dispatch({ type: 'flip', index: i });
      r.dispatch({ type: 'flip', index: j });
    });
    expect(outcome.metrics).toMatchObject({ boards: 3, pairs: 3 + 6 + 8, moves: 17 });
    expect(outcome.accuracy).toBe(100);
  });
});

describe('Emoji Hunt', () => {
  it('grows the grid within the session and with the level', () => {
    expect([0, 4, 7].map(r => huntRound(1, r).size)).toEqual([4, 5, 6]);
    expect(huntRound(10, 9).size).toBe(8);
    expect(huntRound(1, 0).difficulty).toBe('easy');
    expect(huntRound(9, 9).difficulty).toBe('hard');
  });

  it('places exactly one target', () => {
    const s = emojiHuntEngine.init(5, ctx(0, 8));
    expect(s.grid.filter(e => e === s.target)).toHaveLength(1);
    expect(s.grid[s.targetIndex]).toBe(s.target);
  });
});

describe('geography quizzes', () => {
  it('more options with the level; quick answers earn a bonus', () => {
    expect([1, 5, 9].map(optionCount)).toEqual([4, 5, 6]);
    expect(timeBonus(1500)).toBe(10);
    expect(timeBonus(10000)).toBe(0);
  });

  it('every question has its answer among distinct options', () => {
    const rng = createRng(3);
    for (const kind of ['flags', 'capitals', 'continents', 'currencies', 'car-logos'] as GeoKind[]) {
      for (const level of [1, 5, 10]) {
        for (let i = 0; i < 30; i++) {
          const q = makeQuestion(kind, level, [], rng);
          expect(q.options).toContain(q.answer);
          expect(new Set(q.options).size).toBe(q.options.length);
        }
      }
    }
  });

  it('hides the country name from level 5 in capitals and continents', () => {
    const rng = createRng(1);
    const shows = (level: number) => new Set(Array.from({ length: 40 }, () => makeQuestion('continents', level, [], rng).prompt.show));
    expect([...shows(1)]).toEqual(['flag+country']);
    expect([...shows(5)]).toEqual(['flag']);
    expect(makeQuestion('continents', 5, [], rng).options).toHaveLength(6);
  });

  it('only asks undisputed continents; capitals of every country, namesakes included', () => {
    for (const code of Object.keys(CONTINENT_OF)) expect(['RU', 'TR', 'KZ', 'EG', 'GE', 'AM', 'AZ', 'CY']).not.toContain(code);
    expect(CAPITAL_COUNTRIES).toContain('SG');
    expect(CAPITAL_COUNTRIES).toContain('DZ');
  });

  it('currency questions have exactly one right answer', () => {
    const rng = createRng(5);
    const clash = (a: string, b: string) => a === b || CURRENCY_CONFLICTS.some(p => p.includes(a) && p.includes(b));
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion('currencies', 1 + (i % 10), [], rng);
      if (q.optionKind === 'currency') {
        expect(q.answer).toBe(CURRENCY_OF[q.prompt.code as SupportedCountryCode]);
        for (const a of q.options) for (const b of q.options) if (a !== b) expect(clash(a, b), `${a}/${b}`).toBe(false);
      } else {
        expect(q.prompt.show).toBe('currency');
        const currency = CURRENCY_OF[q.prompt.code as SupportedCountryCode];
        expect(q.options.filter(c => clash(CURRENCY_OF[c as SupportedCountryCode], currency))).toEqual([q.answer]);
      }
    }
  });

  it('mixes both directions in flags and car logos; flags beside countries named by capital or currency', () => {
    const rng = createRng(8);
    for (const [kind, kinds] of [['flags', ['country', 'flag']], ['car-logos', ['brand', 'logo']]] as const) {
      const seen = new Set(Array.from({ length: 40 }, () => makeQuestion(kind, 3, [], rng).optionKind));
      expect([...seen].sort()).toEqual([...kinds].sort());
    }
    const capitalOf = Array.from({ length: 40 }, () => makeQuestion('capitals', 3, [], rng)).filter(q => q.prompt.show === 'capital');
    expect(capitalOf.length).toBeGreaterThan(0);
    expect(capitalOf.every(q => q.optionKind === 'country+flag')).toBe(true);
  });

  it('never repeats a country within a session', () => {
    const { runner } = play(makeGeoEngine('capitals'), 9, (s, r) => s.phase === 'playing' && r.dispatch({ type: 'pick', option: s.question.answer }));
    expect(new Set(runner.state.used).size).toBe(runner.state.used.length);
    expect(runner.state.answers.every(a => a.correct)).toBe(true);
  });
});

describe('N-Back', () => {
  it('sets N and pace by level and fills 90 s', () => {
    expect(nBackLayout(1)).toEqual({ n: 1, intervalMs: 2600, trials: 34 });
    expect(nBackLayout(5).n).toBe(2);
    expect(nBackLayout(10).n).toBe(3);
  });

  it('generates about 30% targets and no accidental ones', () => {
    const seq = nBackSequence(2, 400, createRng(2));
    const targets = seq.filter((c, i) => i >= 2 && c === seq[i - 2]).length;
    expect(targets / 398).toBeGreaterThan(0.2);
    expect(targets / 398).toBeLessThan(0.4);
  });

  it('a perfect player scores every target and no false alarms', () => {
    const { outcome } = play(nBackEngine, 5, (s, r) => {
      if (s.phase === 'playing' && !s.responded && isTarget(s)) r.dispatch({ type: 'match' });
    });
    expect(outcome.metrics.misses).toBe(0);
    expect(outcome.metrics.falseAlarms).toBe(0);
    expect(outcome.accuracy).toBe(100);
    expect(nBackRating(outcome, 5)).toBe(levelCeiling(5));
  });

  it('pressing every time is worth nothing', () => {
    const { outcome } = play(nBackEngine, 1, (s, r) => s.phase === 'playing' && !s.responded && r.dispatch({ type: 'match' }));
    expect(nBackRating(outcome, 1)).toBe(0);
  });
});

describe('history from before levels', () => {
  const v1 = (gameId: 'n-back' | 'memory-flip' | 'emoji-hunt' | 'dual-rule-reaction', score: number) => normalizeSession({
    id: 'x', gameId, schemaVersion: 2, startedAt: 1, durationMs: 0, level: 1, score, rating: 0, accuracy: 100, avgTimeMs: 0, metrics: {},
  });

  it('counts at the v1-equivalent level and on the new scale', () => {
    expect(v1('n-back', 45)).toMatchObject({ level: 4, rating: levelCeiling(4) });
    expect(v1('memory-flip', 50)).toMatchObject({ level: 4, rating: levelCeiling(4) / 2 });
    expect(v1('emoji-hunt', 125)).toMatchObject({ level: 4, rating: levelCeiling(4) });
    expect(v1('dual-rule-reaction', 30)).toMatchObject({ level: 2, rating: levelCeiling(2) });
  });
});
