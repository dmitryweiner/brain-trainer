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
  kind: 'wave' | 'zigzag' | 'spiral';
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

/** Levels 1–3 waves, 4–6 zigzags, 7–10 spirals; each harder within its kind. */
export function makePath(level: number, rng: Rng): TracePath {
  const flip = rng.next() < 0.5 ? -1 : 1;
  if (level <= 3) {
    const amp = (12 + 6 * level) * flip;
    const periods = 1 + 0.5 * (level - 1) + rng.next() * 0.5;
    const pts = Array.from({ length: 161 }, (_, i) => {
      const t = i / 160;
      return { x: 10 + 80 * t, y: 50 + amp * Math.sin(t * periods * 2 * Math.PI) };
    });
    return withLengths(pts, 'wave');
  }
  if (level <= 6) {
    const segments = 3 + (level - 3);
    const corners = Array.from({ length: segments + 1 }, (_, i) => ({
      x: 10 + (80 * i) / segments,
      y: i % 2 === 0 ? 50 - 25 * flip : 50 + 25 * flip,
    }));
    return withLengths(resample(corners), 'zigzag');
  }
  const turns = 1.25 + 0.25 * (level - 7);
  const start = rng.next() * 2 * Math.PI;
  const pts = Array.from({ length: 241 }, (_, i) => {
    const t = i / 240;
    const r = 6 + 34 * t;
    const a = start + flip * t * turns * 2 * Math.PI;
    return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
  });
  return withLengths(pts, 'spiral');
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
