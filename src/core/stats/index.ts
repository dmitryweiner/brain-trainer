// Aggregates derived from the event log (PLAN-IMPROVEMENTS.md, 4.1). Nothing
// here is stored or synced: levels, records and trends are recomputed, so the
// log stays the only source of truth.
import type { GameCategory, GameDefinition, GameId, GameSession } from '../types';
import type { StoredEvent } from '../storage/schema';

/** Sessions still counted: a reset hides the sessions of its game(s) that started at or before it. */
export function activeSessions(events: readonly StoredEvent[]): GameSession[] {
  const resets = events.filter(e => e.kind === 'reset');
  const out: GameSession[] = [];
  for (const e of events) {
    if (e.kind !== 'session') continue;
    const s = e.session;
    const hidden = resets.some(r => (r.gameId === null || r.gameId === s.gameId) && s.startedAt <= r.at);
    if (!hidden) out.push(s);
  }
  return out.sort((a, b) => a.startedAt - b.startedAt);
}

/** "Опыт" in the header: every point ever earned, resets do not take it back. */
export function totalXp(events: readonly StoredEvent[]): number {
  let xp = 0;
  for (const e of events) {
    if (e.kind === 'session') xp += e.session.score;
    else if (e.kind === 'xp') xp += e.amount;
  }
  return Math.round(xp * 10) / 10;
}

/** Slope of the least-squares line through the values (per session). */
export function trendSlope(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  return num / den;
}

export type Trend = 'improving' | 'declining' | 'stable';

/** Rating points per session that count as a real change */
export const TREND_THRESHOLD = 5;

export function trendOf(ratings: readonly number[]): Trend {
  if (ratings.length < 3) return 'stable';
  const slope = trendSlope(ratings);
  if (slope > TREND_THRESHOLD) return 'improving';
  if (slope < -TREND_THRESHOLD) return 'declining';
  return 'stable';
}

export interface GameStats {
  totalGames: number;
  bestScore: number;
  bestRating: number;
  averageScore: number;
  averageAccuracy: number;
  last: GameSession | null;
  previous: GameSession | null;
  /** Ratings of the last 10 sessions, oldest first */
  sparkline: number[];
  recentTrend: Trend;
  bestMetrics: Record<string, number>;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Metrics where less is better; everything else is "more is better". */
const LOWER_IS_BETTER = /(Ms|Time|falseStarts|errors|misses)$/;

export function gameStats(sessions: readonly GameSession[], gameId: GameId): GameStats {
  const list = sessions.filter(s => s.gameId === gameId);
  const n = list.length;
  const ratings = list.map(s => s.rating);
  const recent = ratings.slice(-10);
  const bestMetrics: Record<string, number> = {};
  for (const s of list) {
    for (const [k, v] of Object.entries(s.metrics)) {
      const lower = LOWER_IS_BETTER.test(k);
      if (!(k in bestMetrics) || (lower ? v < bestMetrics[k] : v > bestMetrics[k])) bestMetrics[k] = v;
    }
  }
  return {
    totalGames: n,
    bestScore: n > 0 ? Math.max(...list.map(s => s.score)) : 0,
    bestRating: n > 0 ? Math.max(...ratings) : 0,
    averageScore: n > 0 ? round1(list.reduce((a, s) => a + s.score, 0) / n) : 0,
    averageAccuracy: n > 0 ? round1(list.reduce((a, s) => a + s.accuracy, 0) / n) : 0,
    last: list[n - 1] ?? null,
    previous: list[n - 2] ?? null,
    sparkline: recent,
    recentTrend: trendOf(recent),
    bestMetrics,
  };
}

/** Local calendar day, YYYY-MM-DD */
export function dayKey(epochMs: number): string {
  const d = new Date(epochMs);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function sinceDays(now: number, days: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.getTime();
}

export interface DailyStats {
  date: string;
  gamesPlayed: number;
  totalScore: number;
  averageAccuracy: number;
  gameBreakdown: Record<string, { count: number; totalScore: number; avgAccuracy: number }>;
}

/** Last `days` days, most recent first */
export function dailyStats(sessions: readonly GameSession[], days: number, now: number): DailyStats[] {
  const from = sinceDays(now, days);
  const byDay = new Map<string, GameSession[]>();
  for (const s of sessions) {
    if (s.startedAt < from) continue;
    const key = dayKey(s.startedAt);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  const out: DailyStats[] = [];
  for (const [date, list] of byDay) {
    const gameBreakdown: DailyStats['gameBreakdown'] = {};
    for (const s of list) {
      const g = (gameBreakdown[s.gameId] ??= { count: 0, totalScore: 0, avgAccuracy: 0 });
      g.avgAccuracy = (g.avgAccuracy * g.count + s.accuracy) / (g.count + 1);
      g.count++;
      g.totalScore += s.score;
    }
    out.push({
      date,
      gamesPlayed: list.length,
      totalScore: list.reduce((a, s) => a + s.score, 0),
      averageAccuracy: list.reduce((a, s) => a + s.accuracy, 0) / list.length,
      gameBreakdown,
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface GameDailyStats {
  date: string;
  gamesPlayed: number;
  averageScore: number;
  averageAccuracy: number;
  averageRating: number;
  bestRating: number;
}

/** One game, last `days` days, oldest first (for charts) */
export function gameDailyStats(
  sessions: readonly GameSession[], gameId: GameId, days: number, now: number,
): GameDailyStats[] {
  const from = sinceDays(now, days);
  const byDay = new Map<string, GameSession[]>();
  for (const s of sessions) {
    if (s.gameId !== gameId || s.startedAt < from) continue;
    const key = dayKey(s.startedAt);
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  return [...byDay].map(([date, list]) => ({
    date,
    gamesPlayed: list.length,
    averageScore: round1(list.reduce((a, s) => a + s.score, 0) / list.length),
    averageAccuracy: round1(list.reduce((a, s) => a + s.accuracy, 0) / list.length),
    averageRating: Math.round(list.reduce((a, s) => a + s.rating, 0) / list.length),
    bestRating: Math.max(...list.map(s => s.rating)),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

/** Adaptive difficulty (3.1): ≥85% accuracy goes up a level, <60% goes down. */
export const LEVEL_UP_ACCURACY = 85;
export const LEVEL_DOWN_ACCURACY = 60;

export function nextLevel(level: number, accuracy: number, game: Pick<GameDefinition, 'minLevel' | 'maxLevel'>): number {
  let next = level;
  if (accuracy >= LEVEL_UP_ACCURACY) next = level + 1;
  else if (accuracy < LEVEL_DOWN_ACCURACY) next = level - 1;
  return Math.min(game.maxLevel, Math.max(game.minLevel, next));
}

/** The level the next session of `game` is played at. */
export function currentLevel(sessions: readonly GameSession[], game: GameDefinition): number {
  let last: GameSession | undefined;
  for (const s of sessions) if (s.gameId === game.id) last = s;
  return last ? nextLevel(last.level, last.accuracy, game) : game.minLevel;
}

/** Category index: mean best rating of the category's played games (0 if none played). */
export function categoryIndex(
  sessions: readonly GameSession[], games: readonly GameDefinition[],
): Record<GameCategory, number> {
  const result: Record<GameCategory, number> = { memory: 0, attention: 0, reaction: 0, spatial: 0, knowledge: 0 };
  const best = new Map<GameId, number>();
  for (const s of sessions) best.set(s.gameId, Math.max(best.get(s.gameId) ?? 0, s.rating));
  for (const category of Object.keys(result) as GameCategory[]) {
    const played = games.filter(g => g.category === category && best.has(g.id)).map(g => best.get(g.id)!);
    result[category] = played.length > 0 ? Math.round(played.reduce((a, b) => a + b, 0) / played.length) : 0;
  }
  return result;
}
