import { describe, it, expect } from 'vitest';
import {
  calculateReactionScore,
  calculateTotalReactionScore,
  calculateAverageTime,
  calculateColorTapScore,
  calculateHiddenNumberScore,
  calculateMemoryFlipScore,
  isCorrectPair,
  formatTime,
  calculateAccuracy,
} from './gameUtils';

describe('gameUtils', () => {
  describe('calculateReactionScore', () => {
    it('should return 5 for very fast reaction (< 300ms)', () => {
      expect(calculateReactionScore(250)).toBe(5);
      expect(calculateReactionScore(299)).toBe(5);
    });

    it('should return 3 for fast reaction (300-499ms)', () => {
      expect(calculateReactionScore(300)).toBe(3);
      expect(calculateReactionScore(450)).toBe(3);
      expect(calculateReactionScore(499)).toBe(3);
    });

    it('should return 2 for medium reaction (500-799ms)', () => {
      expect(calculateReactionScore(500)).toBe(2);
      expect(calculateReactionScore(700)).toBe(2);
      expect(calculateReactionScore(799)).toBe(2);
    });

    it('should return 1 for slow reaction (>= 800ms)', () => {
      expect(calculateReactionScore(800)).toBe(1);
      expect(calculateReactionScore(1000)).toBe(1);
    });
  });

  describe('calculateTotalReactionScore', () => {
    it('should sum up all reaction scores', () => {
      const times = [250, 400, 600, 900, 200];
      // Scores: 5 + 3 + 2 + 1 + 5 = 16
      expect(calculateTotalReactionScore(times)).toBe(16);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotalReactionScore([])).toBe(0);
    });
  });

  describe('calculateAverageTime', () => {
    it('should calculate average correctly', () => {
      expect(calculateAverageTime([100, 200, 300])).toBe(200);
    });

    it('should round to nearest integer', () => {
      expect(calculateAverageTime([100, 200, 250])).toBe(183);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAverageTime([])).toBe(0);
    });
  });

  describe('calculateColorTapScore', () => {
    it('should calculate score correctly', () => {
      expect(calculateColorTapScore(10, 5)).toBe(12.5);
    });

    it('should handle zero fast answers', () => {
      expect(calculateColorTapScore(10, 0)).toBe(10);
    });

    it('should handle zero correct answers', () => {
      expect(calculateColorTapScore(0, 10)).toBe(5);
    });
  });

  describe('calculateHiddenNumberScore', () => {
    it('should return 3 for very fast time (< 3s)', () => {
      expect(calculateHiddenNumberScore(2000)).toBe(3);
      expect(calculateHiddenNumberScore(2999)).toBe(3);
    });

    it('should return 2 for medium time (3-5s)', () => {
      expect(calculateHiddenNumberScore(3000)).toBe(2);
      expect(calculateHiddenNumberScore(4500)).toBe(2);
      expect(calculateHiddenNumberScore(4999)).toBe(2);
    });

    it('should return 1 for slow time (>= 5s)', () => {
      expect(calculateHiddenNumberScore(5000)).toBe(1);
      expect(calculateHiddenNumberScore(10000)).toBe(1);
    });
  });

  describe('calculateMemoryFlipScore', () => {
    it('should calculate level 1 score correctly', () => {
      expect(calculateMemoryFlipScore(1, 5)).toBe(10); // optimal moves
      expect(calculateMemoryFlipScore(1, 6)).toBe(9);  // 1 extra move
      expect(calculateMemoryFlipScore(1, 10)).toBe(5); // 5 extra moves
    });

    it('should not go below 0 for level 1', () => {
      expect(calculateMemoryFlipScore(1, 20)).toBe(0);
    });

    it('should calculate level 2 score correctly', () => {
      expect(calculateMemoryFlipScore(2, 10)).toBe(20); // optimal moves
      expect(calculateMemoryFlipScore(2, 12)).toBe(18); // 2 extra moves
      expect(calculateMemoryFlipScore(2, 15)).toBe(15); // 5 extra moves
    });

    it('should not go below 0 for level 2', () => {
      expect(calculateMemoryFlipScore(2, 40)).toBe(0);
    });

    it('should handle better than optimal moves', () => {
      expect(calculateMemoryFlipScore(1, 3)).toBe(10);
      expect(calculateMemoryFlipScore(2, 8)).toBe(20);
    });
  });

  describe('isCorrectPair', () => {
    const correctPairs = [[0, 1], [2, 3]];

    it('should return true for correct pairs', () => {
      expect(isCorrectPair([0, 1], correctPairs)).toBe(true);
      expect(isCorrectPair([1, 0], correctPairs)).toBe(true); // order doesn't matter
      expect(isCorrectPair([2, 3], correctPairs)).toBe(true);
    });

    it('should return false for incorrect pairs', () => {
      expect(isCorrectPair([0, 2], correctPairs)).toBe(false);
      expect(isCorrectPair([1, 3], correctPairs)).toBe(false);
    });

    it('should return false if not exactly 2 items selected', () => {
      expect(isCorrectPair([0], correctPairs)).toBe(false);
      expect(isCorrectPair([0, 1, 2], correctPairs)).toBe(false);
      expect(isCorrectPair([], correctPairs)).toBe(false);
    });

    it('should handle multiple valid pairs', () => {
      const multiplePairs = [[0, 1], [0, 2], [1, 2]];
      expect(isCorrectPair([0, 1], multiplePairs)).toBe(true);
      expect(isCorrectPair([0, 2], multiplePairs)).toBe(true);
      expect(isCorrectPair([1, 2], multiplePairs)).toBe(true);
      expect(isCorrectPair([0, 3], multiplePairs)).toBe(false);
    });
  });

  describe('formatTime', () => {
    it('should format milliseconds only', () => {
      expect(formatTime(250)).toBe('250ms');
      expect(formatTime(999)).toBe('999ms');
    });

    it('should format seconds with decimal', () => {
      expect(formatTime(1000)).toBe('1.0s');
      expect(formatTime(1250)).toBe('1.2s');
      expect(formatTime(2567)).toBe('2.5s');
    });

    it('should handle zero', () => {
      expect(formatTime(0)).toBe('0ms');
    });
  });

  describe('calculateAccuracy', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateAccuracy(8, 10)).toBe(80);
      expect(calculateAccuracy(5, 10)).toBe(50);
      expect(calculateAccuracy(10, 10)).toBe(100);
    });

    it('should round to nearest integer', () => {
      expect(calculateAccuracy(1, 3)).toBe(33);
      expect(calculateAccuracy(2, 3)).toBe(67);
    });

    it('should return 0 for zero total', () => {
      expect(calculateAccuracy(0, 0)).toBe(0);
    });

    it('should handle zero correct answers', () => {
      expect(calculateAccuracy(0, 10)).toBe(0);
    });
  });
});

