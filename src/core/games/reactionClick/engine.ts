// Reaction Click, shown as a runner game: a cactus appears in front of the
// running dino, tap to jump — the reaction time is measured from its
// appearance. Too slow and the dino crashes; a jump before it — or over a
// bird decoy (from level 4) — is a false start. Both cost a life. 10
// obstacles, 3 lives; quick reactions in a row multiply the points.
import type { EngineContext, GameEngine, SessionOutcome, TimerRequest } from '../../types';
import { average, clampLevel, counterCues, elapsed } from '../common';

export const REACTION_CLICK = {
  attempts: 10,
  lives: 3,
  minDelayMs: 1000,
  maxDelayMs: 3500,
  decoyMs: 700,
  clickedPauseMs: 700,
  falseStartPauseMs: 1000,
  /** reactions under this extend the streak */
  quickMs: 350,
  /** every this many quick reactions in a row add 1 to the multiplier */
  comboStep: 3,
  /** metrics.rules of sessions with lives and decoys (earlier ones had 5 attempts) */
  rules: 2,
} as const;

/** How long the cactus takes to reach the dino: the time to react */
export function reachMs(level: number): number {
  return Math.max(600, 1400 - 90 * (clampLevel(level) - 1));
}

export function decoyChance(level: number): number {
  const L = clampLevel(level);
  return L < 4 ? 0 : 0.15 + 0.03 * L;
}

export type ReactionPhase = 'waiting' | 'decoy' | 'ready' | 'clicked' | 'tooEarly' | 'crashed' | 'done';

export interface ReactionClickState {
  phase: ReactionPhase;
  level: number;
  /** Attempts used so far */
  attempt: number;
  lives: number;
  reactionTimes: number[];
  score: number;
  falseStarts: number;
  /** too slow: the dino ran into the cactus */
  crashes: number;
  combo: number;
  maxCombo: number;
  /** waiting/decoy: when the phase ends; clicked/tooEarly: when the next attempt starts */
  until: number;
  /** When the signal showed (phase 'ready') */
  readyAt: number;
  /** whether this attempt still has a decoy to show before the real signal */
  decoyPending: boolean;
}

export type ReactionClickEvent = { type: 'tap' } | { type: 'go' } | { type: 'next' } | { type: 'crash' };

export function reactionPoints(ms: number): number {
  if (ms < 300) return 5;
  if (ms < 500) return 3;
  if (ms < 800) return 2;
  return 1;
}

function waitFor(state: ReactionClickState, ctx: EngineContext): ReactionClickState {
  const delay = ctx.rng.int(REACTION_CLICK.minDelayMs, REACTION_CLICK.maxDelayMs);
  const decoyPending = ctx.rng.next() < decoyChance(state.level);
  // a decoy shows partway through the wait, the real signal after it
  const until = ctx.now + (decoyPending ? Math.round(delay * 0.5) : delay);
  return { ...state, phase: 'waiting', until, decoyPending };
}

function falseStart(state: ReactionClickState, now: number): ReactionClickState {
  return {
    ...state,
    phase: 'tooEarly',
    attempt: state.attempt + 1,
    lives: state.lives - 1,
    falseStarts: state.falseStarts + 1,
    combo: 0,
    until: now + REACTION_CLICK.falseStartPauseMs,
  };
}

export const reactionClickEngine: GameEngine<ReactionClickState, ReactionClickEvent> = {
  init(level, ctx) {
    return waitFor(
      {
        phase: 'waiting', level: clampLevel(level), attempt: 0, lives: REACTION_CLICK.lives, reactionTimes: [], score: 0,
        falseStarts: 0, crashes: 0, combo: 0, maxCombo: 0, until: 0, readyAt: 0, decoyPending: false,
      },
      ctx,
    );
  },

  reduce(state, event, ctx) {
    const { now } = ctx;
    switch (event.type) {
      case 'go':
        if (state.phase === 'waiting' && state.decoyPending) {
          return { ...state, phase: 'decoy', decoyPending: false, until: now + REACTION_CLICK.decoyMs };
        }
        if (state.phase === 'decoy') {
          // after the decoy: a short wait, then the real signal
          return { ...state, phase: 'waiting', until: now + ctx.rng.int(500, 1500) };
        }
        return state.phase === 'waiting' ? { ...state, phase: 'ready', readyAt: now } : state;
      case 'tap':
        if (state.phase === 'waiting' || state.phase === 'decoy') return falseStart(state, now);
        if (state.phase === 'ready') {
          const ms = elapsed(now, state.readyAt);
          const combo = ms < REACTION_CLICK.quickMs ? state.combo + 1 : 0;
          const multiplier = 1 + Math.floor(Math.max(0, combo - 1) / REACTION_CLICK.comboStep);
          return {
            ...state,
            phase: 'clicked',
            attempt: state.attempt + 1,
            reactionTimes: [...state.reactionTimes, ms],
            score: state.score + reactionPoints(ms) * multiplier,
            combo,
            maxCombo: Math.max(state.maxCombo, combo),
            until: now + REACTION_CLICK.clickedPauseMs,
          };
        }
        return state;
      case 'crash':
        if (state.phase !== 'ready') return state;
        return {
          ...state,
          phase: 'crashed',
          attempt: state.attempt + 1,
          lives: state.lives - 1,
          crashes: state.crashes + 1,
          combo: 0,
          until: now + REACTION_CLICK.falseStartPauseMs,
        };
      case 'next':
        if (state.phase !== 'clicked' && state.phase !== 'tooEarly' && state.phase !== 'crashed') return state;
        return state.attempt >= REACTION_CLICK.attempts || state.lives <= 0 ? { ...state, phase: 'done' } : waitFor(state, ctx);
    }
  },

  timers(state): TimerRequest<ReactionClickEvent>[] {
    if (state.phase === 'waiting' || state.phase === 'decoy') {
      return [{ id: `go-${state.attempt}-${state.phase}-${state.until}`, at: state.until, event: { type: 'go' } }];
    }
    if (state.phase === 'ready') {
      return [{ id: `crash-${state.attempt}`, at: state.readyAt + reachMs(state.level), event: { type: 'crash' } }];
    }
    if (state.phase === 'clicked' || state.phase === 'tooEarly' || state.phase === 'crashed') {
      return [{ id: `next-${state.attempt}`, at: state.until, event: { type: 'next' } }];
    }
    return [];
  },

  cues: counterCues<ReactionClickState>(s => s.reactionTimes.length, s => s.falseStarts + s.crashes),

  isFinished: state => state.phase === 'done',

  result(state): SessionOutcome {
    const times = state.reactionTimes;
    const metrics: Record<string, number> = {
      falseStarts: state.falseStarts,
      crashes: state.crashes,
      hits: times.length,
      attempts: state.attempt,
      maxCombo: state.maxCombo,
      livesLeft: Math.max(0, state.lives),
      rules: REACTION_CLICK.rules,
    };
    if (times.length > 0) {
      metrics.bestReactionMs = Math.min(...times);
      metrics.worstReactionMs = Math.max(...times);
    }
    return {
      score: state.score,
      accuracy: state.attempt > 0 ? Math.round((times.length / state.attempt) * 100) : 0,
      avgTimeMs: average(times),
      metrics,
    };
  },
};

/** Raw-score maximum of the v1 game (5 attempts × 5 points) */
const V1_MAX_SCORE = 25;
const FASTEST_MS = 200;
const SLOWEST_MS = 1000;

function speed(avgMs: number): number {
  return Math.min(1, Math.max(0, (SLOWEST_MS - avgMs) / (SLOWEST_MS - FASTEST_MS)));
}

/** Decoys make a level harder, but speed is the skill: the level adds at most 13.5% */
function levelFactor(level: number): number {
  return 0.85 + 0.015 * clampLevel(level);
}

/**
 * Share of clean attempts × speed of the average reaction × a small level
 * factor: 200 ms or faster at level 10 is 1000. v1 history (no metrics) maps
 * its points onto the same scale (25 points ≈ all attempts at about 250 ms);
 * sessions before lives had 5 attempts.
 */
export function reactionClickRating(outcome: SessionOutcome, level: number): number {
  const m = outcome.metrics;
  if (m.hits === undefined) return (outcome.score / V1_MAX_SCORE) * speed(250) * 1000 * levelFactor(level);
  const attempts = m.attempts ?? 5;
  // running out of lives early counts the unplayed attempts as misses
  const share = m.hits / Math.max(attempts, m.rules === REACTION_CLICK.rules ? REACTION_CLICK.attempts : attempts);
  return share * speed(outcome.avgTimeMs) * 1000 * levelFactor(level);
}
