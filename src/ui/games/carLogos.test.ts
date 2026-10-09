import { describe, it, expect } from 'vitest';
import { CAR_BRANDS } from '../../core/games/geoQuiz/cars';
import { CAR_LOGOS } from './carLogos';

describe('car logos', () => {
  it('every brand has a logo, and every logo a brand', () => {
    for (const brand of CAR_BRANDS) expect(CAR_LOGOS[brand], brand).toBeTruthy();
    expect(Object.keys(CAR_LOGOS).sort()).toEqual([...CAR_BRANDS].sort());
  });
});
