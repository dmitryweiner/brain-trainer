// Polyominoes for the spatial games ("rotate the shape", later "mirror").
import type { Rng } from '../../rng';

export type Cell = readonly [number, number];
export type Shape = readonly Cell[];

/** Moved to the origin and sorted, so equal shapes compare equal */
export function normalize(shape: Shape): Shape {
  const minX = Math.min(...shape.map(c => c[0]));
  const minY = Math.min(...shape.map(c => c[1]));
  return shape
    .map(([x, y]) => [x - minX, y - minY] as const)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export function key(shape: Shape): string {
  return normalize(shape).map(c => c.join(',')).join(' ');
}

/** 90° clockwise, `times` times */
export function rotate(shape: Shape, times = 1): Shape {
  let s = shape;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) s = s.map(([x, y]) => [-y, x] as const);
  return normalize(s);
}

export function mirror(shape: Shape): Shape {
  return normalize(shape.map(([x, y]) => [-x, y] as const));
}

/** Same up to rotation */
export function sameUpToRotation(a: Shape, b: Shape): boolean {
  const kb = key(b);
  return [0, 1, 2, 3].some(k => key(rotate(a, k)) === kb);
}

/** A mirror image that no rotation can produce: required for a fair "is it rotated or mirrored" question */
export function isChiral(shape: Shape): boolean {
  return !sameUpToRotation(shape, mirror(shape));
}

const NEIGHBORS: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function connected(shape: Shape): boolean {
  const set = new Set(shape.map(c => c.join(',')));
  const seen = new Set<string>([shape[0].join(',')]);
  const stack = [shape[0]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of NEIGHBORS) {
      const k = `${x + dx},${y + dy}`;
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === shape.length;
}

/** A random polyomino of n cells, grown cell by cell */
export function randomPolyomino(n: number, rng: Rng): Shape {
  const cells: Cell[] = [[0, 0]];
  while (cells.length < n) {
    const [x, y] = rng.pick(cells);
    const [dx, dy] = rng.pick(NEIGHBORS);
    const c: Cell = [x + dx, y + dy];
    if (!cells.some(d => d[0] === c[0] && d[1] === c[1])) cells.push(c);
  }
  return normalize(cells);
}

/** A random chiral polyomino of n cells (n ≥ 4: no chiral shapes are smaller) */
export function randomChiral(n: number, rng: Rng): Shape {
  for (;;) {
    const shape = randomPolyomino(n, rng);
    if (isChiral(shape)) return shape;
  }
}

/** The shape with one cell moved elsewhere along its edge; a different shape, still connected and chiral */
export function nearMiss(shape: Shape, rng: Rng): Shape | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const drop = rng.int(0, shape.length - 1);
    const without = shape.filter((_, i) => i !== drop);
    if (!connected(without)) continue;
    const [x, y] = rng.pick(without);
    const [dx, dy] = rng.pick(NEIGHBORS);
    const added: Cell = [x + dx, y + dy];
    if (without.some(c => c[0] === added[0] && c[1] === added[1])) continue;
    const candidate = normalize([...without, added]);
    if (!connected(candidate) || !isChiral(candidate)) continue;
    if (sameUpToRotation(candidate, shape) || sameUpToRotation(candidate, mirror(shape))) continue;
    return candidate;
  }
  return null;
}
