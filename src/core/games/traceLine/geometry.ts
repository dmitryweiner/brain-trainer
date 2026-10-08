// Curves for "trace the line", in a 0–100 square (the view's viewBox).
import type { Rng } from '../../rng';

export interface Pt {
  x: number;
  y: number;
}

export interface TracePath {
  points: Pt[];
  /** cumulative length at each point */
  cum: number[];
  length: number;
  kind: 'wave' | 'zigzag' | 'grid';
}

function withLengths(points: Pt[], kind: TracePath['kind']): TracePath {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { points, cum, length: cum[cum.length - 1], kind };
}

/** Even samples along a polyline through the corners */
function resample(corners: Pt[], step = 1): Pt[] {
  const out: Pt[] = [corners[0]];
  for (let i = 1; i < corners.length; i++) {
    const a = corners[i - 1];
    const b = corners[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/**
 * A long winding route over an n×n grid of points (randomized depth-first
 * search that keeps the longest path found): turns like a maze corridor.
 */
function gridRoute(n: number, rng: Rng): Pt[] {
  const target = Math.ceil(n * n * 0.6);
  const seen = new Set<number>();
  let best: number[] = [];
  const path: number[] = [];
  let budget = 4000;
  const walk = (at: number): boolean => {
    path.push(at);
    seen.add(at);
    if (path.length > best.length) best = [...path];
    if (path.length >= target || --budget <= 0) return true;
    const x = at % n;
    const y = Math.floor(at / n);
    const next = rng.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])
      .map(([dx, dy]) => [x + dx, y + dy])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < n && ny < n && !seen.has(ny * n + nx));
    for (const [nx, ny] of next) if (walk(ny * n + nx)) return true;
    path.pop();
    seen.delete(at);
    return false;
  };
  walk(rng.int(0, 1) * (n - 1) + rng.int(0, 1) * (n - 1) * n);
  const step = 80 / (n - 1);
  return best.map(i => ({ x: 10 + (i % n) * step, y: 10 + Math.floor(i / n) * step }));
}

/**
 * Level 1 a wave, 2 a zigzag, from 3 a maze-like route over a grid that grows
 * from 5×5 to 9×9 (players found waves and spirals too easy, 2026-10-08).
 */
export function makePath(level: number, rng: Rng): TracePath {
  const flip = rng.next() < 0.5 ? -1 : 1;
  if (level <= 1) {
    const amp = 24 * flip;
    const pts = Array.from({ length: 161 }, (_, i) => {
      const t = i / 160;
      return { x: 10 + 80 * t, y: 50 + amp * Math.sin(t * 1.5 * 2 * Math.PI) };
    });
    return withLengths(pts, 'wave');
  }
  if (level <= 2) {
    const segments = 5;
    const corners = Array.from({ length: segments + 1 }, (_, i) => ({
      x: 10 + (80 * i) / segments,
      y: i % 2 === 0 ? 50 - 30 * flip : 50 + 30 * flip,
    }));
    return withLengths(resample(corners), 'zigzag');
  }
  const n = Math.min(9, 4 + Math.ceil((level - 2) / 1.6));
  return withLengths(resample(gridRoute(n, rng)), 'grid');
}

/** Distance between neighbouring grid lines of a level's route (the corridor must be narrower) */
export function gridSpacing(level: number): number {
  return level <= 2 ? Infinity : 80 / (Math.min(9, 4 + Math.ceil((level - 2) / 1.6)) - 1);
}

/** Half-width of the corridor the finger must stay in */
export function corridor(level: number): number {
  return Math.max(3.5, 9 - 0.55 * level);
}

export interface Projection {
  /** distance from the path */
  dist: number;
  /** arc length of the nearest point */
  along: number;
}

/**
 * Nearest point of the path to p, looking only at arc lengths in
 * [from, to] so a spiral's next loop cannot be "reached" by cutting across.
 */
export function project(path: TracePath, p: Pt, from = 0, to = Infinity): Projection {
  let best: Projection = { dist: Infinity, along: 0 };
  for (let i = 1; i < path.points.length; i++) {
    if (path.cum[i] < from || path.cum[i - 1] > to) continue;
    const a = path.points[i - 1];
    const b = path.points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const dist = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (dist < best.dist) best = { dist, along: path.cum[i - 1] + t * Math.sqrt(len2) };
  }
  return best;
}

/** Point at an arc length (for drawing the progress) */
export function pointAt(path: TracePath, along: number): Pt {
  const i = path.cum.findIndex(c => c >= along);
  if (i <= 0) return path.points[i === 0 ? 0 : path.points.length - 1];
  const t = (along - path.cum[i - 1]) / (path.cum[i] - path.cum[i - 1] || 1);
  const a = path.points[i - 1];
  const b = path.points[i];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
