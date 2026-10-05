import { describe, it, expect } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('repeats the sequence for the same seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });

  it('differs between seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('keeps int() within inclusive bounds and hits both ends', () => {
    const rng = createRng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rng.int(1, 4);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(4);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });

  it('shuffles without losing items and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = createRng(4).shuffle(input);
    expect(out.slice().sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('samples distinct items', () => {
    const out = createRng(5).sample(['a', 'b', 'c', 'd'], 3);
    expect(new Set(out).size).toBe(3);
  });
});
