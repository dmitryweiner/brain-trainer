// Daily workout, streaks and achievements (PLAN-IMPROVEMENTS.md, 3.1). Like
// every other aggregate they are derived from the event log, so they sync
// for free and never disagree between devices.
import type { GameCategory, GameDefinition, GameId, GameSession } from '../types';
import { createRng } from '../rng';
import { dayKey } from './index';

/** The four slots of a workout; a slot is done by any game of its categories */
export const WORKOUT_SLOTS: readonly (readonly GameCategory[])[] = [
  ['memory'], ['attention'], ['reaction'], ['spatial', 'knowledge'],
];

/** FNV-1a: a stable seed from a day key */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The suggested game for each slot on `day`: the same on every device */
export function dailyWorkout(day: string, games: readonly GameDefinition[]): GameId[] {
  const rng = createRng(hash(`workout:${day}`));
  return WORKOUT_SLOTS.map(slot => rng.pick(games.filter(g => slot.includes(g.category))).id);
}

export interface WorkoutProgress {
  day: string;
  games: { id: GameId; done: boolean }[];
  done: number;
  complete: boolean;
}

function categoriesOn(sessions: readonly GameSession[], day: string, categoryOf: (id: GameId) => GameCategory | undefined) {
  const out = new Set<GameCategory>();
  for (const s of sessions) {
    if (dayKey(s.startedAt) !== day) continue;
    const c = categoryOf(s.gameId);
    if (c) out.add(c);
  }
  return out;
}

function categoryLookup(games: readonly GameDefinition[]) {
  const map = new Map(games.map(g => [g.id, g.category] as const));
  return (id: GameId) => map.get(id);
}

/** A slot counts once any game of its categories was played that day */
export function workoutProgress(sessions: readonly GameSession[], day: string, games: readonly GameDefinition[]): WorkoutProgress {
  const played = categoriesOn(sessions, day, categoryLookup(games));
  const plan = dailyWorkout(day, games);
  const list = plan.map((id, i) => ({ id, done: WORKOUT_SLOTS[i].some(c => played.has(c)) }));
  const done = list.filter(g => g.done).length;
  return { day, games: list, done, complete: done === list.length };
}

/** Days on which the workout was completed */
export function workoutDays(sessions: readonly GameSession[], games: readonly GameDefinition[]): Set<string> {
  const categoryOf = categoryLookup(games);
  const byDay = new Map<string, Set<GameCategory>>();
  for (const s of sessions) {
    const c = categoryOf(s.gameId);
    if (!c) continue;
    const day = dayKey(s.startedAt);
    byDay.set(day, (byDay.get(day) ?? new Set()).add(c));
  }
  const out = new Set<string>();
  for (const [day, cats] of byDay) if (WORKOUT_SLOTS.every(slot => slot.some(c => cats.has(c)))) out.add(day);
  return out;
}

function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1).getTime());
}

/** Completed-workout days in a row ending at `day` */
function runEndingAt(days: ReadonlySet<string>, day: string): number {
  let n = 0;
  for (let d = day; days.has(d); d = previousDay(d)) n++;
  return n;
}

/** The workout streak: ends today, or yesterday while today is still open */
export function workoutStreak(sessions: readonly GameSession[], games: readonly GameDefinition[], now: number): number {
  const days = workoutDays(sessions, games);
  const today = dayKey(now);
  return runEndingAt(days, days.has(today) ? today : previousDay(today));
}

export type AchievementId =
  | 'first-game' | 'first-workout' | 'streak-3' | 'streak-7' | 'streak-30'
  | 'level-5' | 'level-10' | 'rating-900' | 'all-categories' | 'explorer' | 'sessions-50' | 'sessions-200';

export interface Achievement {
  id: AchievementId;
  icon: string;
  /** set once unlocked */
  at?: number;
  /** the session that unlocked it */
  sessionId?: string;
  /** current / target, for the locked ones that count something */
  progress?: [number, number];
}

const ICONS: Record<AchievementId, string> = {
  'first-game': '🎉', 'first-workout': '🏋️', 'streak-3': '🔥', 'streak-7': '🔥', 'streak-30': '🌟',
  'level-5': '📈', 'level-10': '🏔️', 'rating-900': '💎', 'all-categories': '🧠', explorer: '🧭',
  'sessions-50': '🎖️', 'sessions-200': '🏆',
};

/** In display order */
export const ACHIEVEMENTS = Object.keys(ICONS) as AchievementId[];

/**
 * Walks the sessions in order and notes when each achievement was first
 * earned. `sessions` must be normalized (effective level, current rating).
 */
export function achievements(sessions: readonly GameSession[], games: readonly GameDefinition[]): Achievement[] {
  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const got = new Map<AchievementId, { at: number; sessionId: string }>();
  const unlock = (id: AchievementId, s: GameSession) => {
    if (!got.has(id)) got.set(id, { at: s.startedAt, sessionId: s.id });
  };
  const categoryOf = categoryLookup(games);
  const leveled = new Set(games.filter(g => g.maxLevel > g.minLevel).map(g => g.id));
  const menu = new Set(games.map(g => g.id));
  const played = new Set<GameId>();
  const dayCategories = new Map<string, Set<GameCategory>>();
  const doneDays = new Set<string>();
  let bestStreak = 0;
  let bestLevel = 0;

  ordered.forEach((s, i) => {
    unlock('first-game', s);
    if (i + 1 >= 50) unlock('sessions-50', s);
    if (i + 1 >= 200) unlock('sessions-200', s);
    if (s.rating >= 900) unlock('rating-900', s);
    if (leveled.has(s.gameId)) {
      bestLevel = Math.max(bestLevel, s.level);
      if (s.level >= 5) unlock('level-5', s);
      if (s.level >= 10) unlock('level-10', s);
    }
    if (menu.has(s.gameId)) played.add(s.gameId);
    if (played.size === menu.size) unlock('explorer', s);

    const day = dayKey(s.startedAt);
    const c = categoryOf(s.gameId);
    if (c) {
      const cats = (dayCategories.get(day) ?? new Set<GameCategory>()).add(c);
      dayCategories.set(day, cats);
      if (new Set(games.map(g => g.category)).size === cats.size) unlock('all-categories', s);
      if (!doneDays.has(day) && WORKOUT_SLOTS.every(slot => slot.some(x => cats.has(x)))) {
        doneDays.add(day);
        unlock('first-workout', s);
        const streak = runEndingAt(doneDays, day);
        bestStreak = Math.max(bestStreak, streak);
        if (streak >= 3) unlock('streak-3', s);
        if (streak >= 7) unlock('streak-7', s);
        if (streak >= 30) unlock('streak-30', s);
      }
    }
  });

  const progress: Partial<Record<AchievementId, [number, number]>> = {
    'streak-3': [bestStreak, 3], 'streak-7': [bestStreak, 7], 'streak-30': [bestStreak, 30],
    'level-5': [bestLevel, 5], 'level-10': [bestLevel, 10], explorer: [played.size, menu.size],
    'sessions-50': [ordered.length, 50], 'sessions-200': [ordered.length, 200],
  };
  return ACHIEVEMENTS.map(id => {
    const a = got.get(id);
    return a ? { id, icon: ICONS[id], at: a.at, sessionId: a.sessionId } : { id, icon: ICONS[id], progress: progress[id] };
  });
}
