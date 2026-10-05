import { describe, it, expect } from 'vitest';
import { SCHEMA_VERSION, type GameSession } from '../types';
import type { StoredEvent } from '../storage/schema';
import { getGame, GAMES } from '../games/registry';
import { buildSession } from '../engine/session';
import {
  activeSessions, categoryIndex, currentLevel, dailyStats, dayKey, gameDailyStats, gameStats, nextLevel,
  totalXp, trendOf, trendSlope,
} from './index';

let n = 0;
function s(over: Partial<GameSession> = {}): GameSession {
  n++;
  return {
    id: `s${n}`, gameId: 'reaction-click', schemaVersion: SCHEMA_VERSION, startedAt: n * 1000, durationMs: 1,
    level: 1, score: 10, rating: 500, accuracy: 80, avgTimeMs: 300, metrics: {}, ...over,
  };
}
const ev = (session: GameSession): StoredEvent => ({ kind: 'session', id: session.id, session });

describe('activeSessions', () => {
  it('hides sessions before a reset of their game or of all games', () => {
    const a = s({ startedAt: 100, gameId: 'n-back' });
    const b = s({ startedAt: 200 });
    const c = s({ startedAt: 400 });
    const events: StoredEvent[] = [ev(a), ev(b), ev(c), { kind: 'reset', id: 'r', at: 300, gameId: 'reaction-click' }];
    expect(activeSessions(events).map(x => x.id)).toEqual([a.id, c.id]);
    events.push({ kind: 'reset', id: 'r2', at: 500, gameId: null });
    expect(activeSessions(events)).toEqual([]);
  });

  it('sorts by start time', () => {
    const late = s({ startedAt: 9000 });
    const early = s({ startedAt: 10 });
    expect(activeSessions([ev(late), ev(early)]).map(x => x.id)).toEqual([early.id, late.id]);
  });
});

describe('totalXp', () => {
  it('sums all session points plus carried-over XP, regardless of resets', () => {
    const events: StoredEvent[] = [
      ev(s({ score: 10 })), ev(s({ score: 2.5 })),
      { kind: 'xp', id: 'x', at: 1, amount: 5 },
      { kind: 'reset', id: 'r', at: 1e12, gameId: null },
    ];
    expect(totalXp(events)).toBe(17.5);
  });
});

describe('trends', () => {
  it('computes the regression slope', () => {
    expect(trendSlope([1, 2, 3, 4])).toBeCloseTo(1);
    expect(trendSlope([5])).toBe(0);
    expect(trendSlope([4, 4, 4])).toBe(0);
  });

  it('classifies the trend', () => {
    expect(trendOf([100, 200, 300])).toBe('improving');
    expect(trendOf([300, 200, 100])).toBe('declining');
    expect(trendOf([500, 502, 499, 501])).toBe('stable');
    expect(trendOf([100, 900])).toBe('stable');
  });
});

describe('gameStats', () => {
  it('returns best, last/previous, sparkline and best metrics', () => {
    const list = [
      s({ score: 10, rating: 300, metrics: { bestReactionMs: 300, hits: 4 } }),
      s({ score: 25, rating: 900, metrics: { bestReactionMs: 210, hits: 5 } }),
      s({ score: 15, rating: 600, metrics: { bestReactionMs: 250, hits: 3 } }),
      s({ gameId: 'n-back', score: 99, rating: 1000 }),
    ];
    const st = gameStats(list, 'reaction-click');
    expect(st.totalGames).toBe(3);
    expect(st.bestScore).toBe(25);
    expect(st.bestRating).toBe(900);
    expect(st.averageScore).toBe(16.7);
    expect(st.last?.id).toBe(list[2].id);
    expect(st.previous?.id).toBe(list[1].id);
    expect(st.sparkline).toEqual([300, 900, 600]);
    expect(st.bestMetrics).toEqual({ bestReactionMs: 210, hits: 5 });
  });

  it('is empty for an unplayed game', () => {
    expect(gameStats([], 'flags-game')).toMatchObject({ totalGames: 0, bestScore: 0, bestRating: 0, last: null, sparkline: [] });
  });

  it('keeps only the last 10 sessions in the sparkline', () => {
    const list = Array.from({ length: 12 }, (_, i) => s({ rating: i }));
    expect(gameStats(list, 'reaction-click').sparkline).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe('daily stats', () => {
  const now = new Date(2026, 9, 5, 12).getTime();
  const today = new Date(2026, 9, 5, 9).getTime();
  const yesterday = new Date(2026, 9, 4, 23, 30).getTime();
  const longAgo = new Date(2026, 6, 1).getTime();

  it('groups by local calendar day within the window', () => {
    const list = [s({ startedAt: today, score: 4, accuracy: 100 }), s({ startedAt: today, score: 6, accuracy: 50, gameId: 'n-back' }), s({ startedAt: yesterday }), s({ startedAt: longAgo })];
    const days = dailyStats(list, 14, now);
    expect(days.map(d => d.date)).toEqual(['2026-10-05', '2026-10-04']);
    expect(days[0]).toMatchObject({ gamesPlayed: 2, totalScore: 10, averageAccuracy: 75 });
    expect(days[0].gameBreakdown['n-back']).toEqual({ count: 1, totalScore: 6, avgAccuracy: 50 });
  });

  it('per game, oldest first, with ratings', () => {
    const list = [s({ startedAt: today, rating: 400 }), s({ startedAt: today, rating: 600 }), s({ startedAt: yesterday, rating: 100 })];
    expect(gameDailyStats(list, 'reaction-click', 14, now)).toEqual([
      { date: '2026-10-04', gamesPlayed: 1, averageScore: 10, averageAccuracy: 80, averageRating: 100, bestRating: 100 },
      { date: '2026-10-05', gamesPlayed: 2, averageScore: 10, averageAccuracy: 80, averageRating: 500, bestRating: 600 },
    ]);
  });

  it('formats day keys in local time', () => {
    expect(dayKey(new Date(2026, 0, 2, 0, 5).getTime())).toBe('2026-01-02');
  });
});

describe('levels', () => {
  const game = { minLevel: 1, maxLevel: 10 };

  it('moves up on ≥85% accuracy, down below 60%, within bounds', () => {
    expect(nextLevel(3, 85, game)).toBe(4);
    expect(nextLevel(3, 84, game)).toBe(3);
    expect(nextLevel(3, 59, game)).toBe(2);
    expect(nextLevel(1, 0, game)).toBe(1);
    expect(nextLevel(10, 100, game)).toBe(10);
  });

  it('derives the current level from the last session', () => {
    const def = { ...getGame('reaction-click'), maxLevel: 10 };
    expect(currentLevel([], def)).toBe(1);
    expect(currentLevel([s({ level: 4, accuracy: 90 }), s({ gameId: 'n-back', level: 9 })], def)).toBe(5);
  });
});

describe('categoryIndex', () => {
  it('averages the best rating of played games per category', () => {
    const list = [
      s({ gameId: 'memory-flip', rating: 400 }), s({ gameId: 'memory-flip', rating: 800 }),
      s({ gameId: 'n-back', rating: 200 }),
      s({ gameId: 'reaction-click', rating: 700 }),
    ];
    expect(categoryIndex(list, GAMES)).toEqual({ memory: 500, attention: 0, reaction: 700, spatial: 0, knowledge: 0 });
  });
});

describe('buildSession', () => {
  it('rates the outcome and sanitizes numbers', () => {
    const game = getGame('reaction-click');
    const session = buildSession(game, { score: 20, accuracy: 100.4, avgTimeMs: NaN, metrics: { a: 1, b: Infinity } }, {
      id: 'x', startedAt: 5, durationMs: 1234.6, level: 1,
    });
    expect(session).toEqual({
      id: 'x', gameId: 'reaction-click', schemaVersion: 2, startedAt: 5, durationMs: 1235, level: 1,
      score: 20, rating: 800, accuracy: 100, avgTimeMs: 0, metrics: { a: 1 },
    });
  });
});
