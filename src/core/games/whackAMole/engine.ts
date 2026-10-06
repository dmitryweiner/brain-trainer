// Whack-a-mole: moles pop up for a moment, tap them before they hide; never
// tap a bomb. 60 s, 3 lives (a missed mole or a tapped bomb costs one), a
// combo multiplier for streaks. Level: grid, mole lifetime, bombs, how many
// at once.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import { average, clampLevel, counterCues, elapsed, levelCeiling, percent, speedFactor } from '../common';

export const WHACK = {
  sessionMs: 60_000,
  lives: 3,
  /** Every this many hits in a row adds 1 to the points per hit */
  comboStep: 5,
  firstSpawnMs: 800,
} as const;

export interface WhackLayout {
  gridSize: number;
  lifetimeMs: number;
  bombChance: number;
  maxActive: number;
  spawnEveryMs: number;
}

export function whackLayout(level: number): WhackLayout {
  const L = clampLevel(level);
  const lifetimeMs = Math.max(550, 1300 - 80 * (L - 1));
  return {
    gridSize: L <= 4 ? 3 : 4,
    lifetimeMs,
    bombChance: L >= 3 ? 0.12 + 0.02 * L : 0,
    maxActive: Math.min(3, 1 + Math.floor((L - 1) / 3)),
    spawnEveryMs: Math.round(lifetimeMs * 0.6),
  };
}

export interface Popup {
  id: number;
  kind: 'mole' | 'bomb';
  shownAt: number;
  until: number;
}

export interface WhackState {
  phase: 'playing' | 'done';
  level: number;
  layout: WhackLayout;
  holes: (Popup | null)[];
  seq: number;
  nextSpawnAt: number;
  endsAt: number;
  lives: number;
  hits: number;
  misses: number;
  bombHits: number;
  combo: number;
  maxCombo: number;
  score: number;
  reactionTimes: number[];
  /** Last outcome per hole, for a short visual (whack / missed / boom) */
  last: { hole: number; what: 'hit' | 'bomb' | 'miss'; at: number } | null;
}

export type WhackEvent =
  | { type: 'tap'; hole: number }
  | { type: 'spawn' }
  | { type: 'expire'; hole: number; id: number }
  | { type: 'end' };

function loseLife(state: WhackState, now: number): WhackState {
  const lives = state.lives - 1;
  return { ...state, lives, combo: 0, ...(lives <= 0 ? { phase: 'done' as const, endsAt: now } : {}) };
}

export const whackEngine: GameEngine<WhackState, WhackEvent> = {
  init(level, ctx: EngineContext) {
    const L = clampLevel(level);
    const layout = whackLayout(L);
    return {
      phase: 'playing', level: L, layout, holes: Array(layout.gridSize ** 2).fill(null), seq: 0,
      nextSpawnAt: ctx.now + WHACK.firstSpawnMs, endsAt: ctx.now + WHACK.sessionMs, lives: WHACK.lives,
      hits: 0, misses: 0, bombHits: 0, combo: 0, maxCombo: 0, score: 0, reactionTimes: [], last: null,
    };
  },

  reduce(state, event, ctx) {
    if (state.phase !== 'playing') return state;
    const { now, rng } = ctx;
    switch (event.type) {
      case 'end':
        return { ...state, phase: 'done' };
      case 'spawn': {
        const free = state.holes.flatMap((h, i) => (h ? [] : [i]));
        const active = state.holes.length - free.length;
        const nextSpawnAt = now + state.layout.spawnEveryMs;
        if (free.length === 0 || active >= state.layout.maxActive) return { ...state, nextSpawnAt };
        const hole = rng.pick(free);
        const kind = rng.next() < state.layout.bombChance ? 'bomb' : 'mole';
        const holes = [...state.holes];
        // bombs linger a little longer: the test is restraint, not speed
        holes[hole] = { id: state.seq + 1, kind, shownAt: now, until: now + state.layout.lifetimeMs * (kind === 'bomb' ? 1.4 : 1) };
        return { ...state, holes, seq: state.seq + 1, nextSpawnAt };
      }
      case 'expire': {
        const p = state.holes[event.hole];
        if (!p || p.id !== event.id) return state;
        const holes = [...state.holes];
        holes[event.hole] = null;
        if (p.kind === 'bomb') return { ...state, holes };
        return loseLife({ ...state, holes, misses: state.misses + 1, last: { hole: event.hole, what: 'miss', at: now } }, now);
      }
      case 'tap': {
        const p = state.holes[event.hole];
        if (!p) return state;
        const holes = [...state.holes];
        holes[event.hole] = null;
        if (p.kind === 'bomb') {
          return loseLife({ ...state, holes, bombHits: state.bombHits + 1, last: { hole: event.hole, what: 'bomb', at: now } }, now);
        }
        const combo = state.combo + 1;
        return {
          ...state,
          holes,
          hits: state.hits + 1,
          combo,
          maxCombo: Math.max(state.maxCombo, combo),
          score: state.score + 1 + Math.floor(state.combo / WHACK.comboStep),
          reactionTimes: [...state.reactionTimes, elapsed(now, p.shownAt)],
          last: { hole: event.hole, what: 'hit', at: now },
        };
      }
    }
  },

  timers(state): TimerRequest<WhackEvent>[] {
    if (state.phase !== 'playing') return [];
    const timers: TimerRequest<WhackEvent>[] = [
      { id: 'end', at: state.endsAt, event: { type: 'end' } },
      { id: `spawn-${state.nextSpawnAt}`, at: state.nextSpawnAt, event: { type: 'spawn' } },
    ];
    state.holes.forEach((p, hole) => {
      if (p) timers.push({ id: `expire-${p.id}`, at: p.until, event: { type: 'expire', hole, id: p.id } });
    });
    return timers;
  },

  cues: counterCues<WhackState>(s => s.hits, s => s.misses + s.bombHits),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    return {
      score: state.score,
      accuracy: percent(state.hits, state.hits + state.misses + state.bombHits),
      avgTimeMs: average(state.reactionTimes),
      metrics: {
        hits: state.hits,
        misses: state.misses,
        bombHits: state.bombHits,
        maxCombo: state.maxCombo,
        livesLeft: state.lives,
        // "lower is better" metric: absent rather than 0 when nothing was hit
        ...(state.reactionTimes.length > 0 ? { bestReactionMs: Math.min(...state.reactionTimes) } : {}),
      },
    };
  },
};

/** Accuracy × speed (≤350 ms full, ≥900 ms 60%) × the level's ceiling; ending early on lives halves it */
export function whackRating(outcome: SessionOutcome, level: number): number {
  const survived = outcome.metrics.livesLeft > 0 ? 1 : 0.5;
  return (outcome.accuracy / 100) * speedFactor(outcome.avgTimeMs, 350, 900, 0.6) * survived * levelCeiling(level);
}
