// Seeded PRNG (mulberry32). Engines take randomness only from an Rng, so a
// seed reproduces a whole session: tests and bug reports get the same layout.

export interface Rng {
  /** Float in [0, 1) */
  next(): number;
  /** Integer in [min, max], both inclusive */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Shuffled copy (Fisher–Yates) */
  shuffle<T>(items: readonly T[]): T[];
  /** `count` distinct items in random order */
  sample<T>(items: readonly T[], count: number): T[];
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return lo + Math.floor(next() * (hi - lo + 1));
  };
  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  return {
    next,
    int,
    pick: items => items[int(0, items.length - 1)],
    shuffle,
    sample: (items, count) => shuffle(items).slice(0, Math.max(0, count)),
  };
}
