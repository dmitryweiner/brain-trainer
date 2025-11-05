import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRandomInt, shuffleArray, getRandomElement, getRandomElements } from './randomUtils';

describe('randomUtils', () => {
  describe('getRandomInt', () => {
    it('should return number in range', () => {
      for (let i = 0; i < 100; i++) {
        const result = getRandomInt(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('should handle single value range', () => {
      const result = getRandomInt(5, 5);
      expect(result).toBe(5);
    });

    it('should handle negative numbers', () => {
      for (let i = 0; i < 100; i++) {
        const result = getRandomInt(-10, -5);
        expect(result).toBeGreaterThanOrEqual(-10);
        expect(result).toBeLessThanOrEqual(-5);
      }
    });

    it('should return predictable value with mocked Math.random', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.5);
      
      const result = getRandomInt(1, 10);
      expect(result).toBe(6);
      
      mockRandom.mockRestore();
    });
  });

  describe('shuffleArray', () => {
    it('should shuffle array', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.5);
      
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).not.toBe(original);
      expect(shuffled.length).toBe(original.length);
      
      mockRandom.mockRestore();
    });

    it('should not modify original array', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      shuffleArray(original);
      
      expect(original).toEqual(copy);
    });

    it('should preserve all elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);
      
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should handle empty array', () => {
      const result = shuffleArray([]);
      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const result = shuffleArray([1]);
      expect(result).toEqual([1]);
    });
  });

  describe('getRandomElement', () => {
    it('should return element from array', () => {
      const array = [1, 2, 3, 4, 5];
      const result = getRandomElement(array);
      
      expect(array).toContain(result);
    });

    it('should return same element for single-element array', () => {
      const result = getRandomElement([42]);
      expect(result).toBe(42);
    });

    it('should return predictable element with mocked random', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.5);
      
      const result = getRandomElement([1, 2, 3, 4, 5]);
      expect(result).toBe(3);
      
      mockRandom.mockRestore();
    });
  });

  describe('getRandomElements', () => {
    it('should return requested number of elements', () => {
      const array = [1, 2, 3, 4, 5];
      const result = getRandomElements(array, 3);
      
      expect(result.length).toBe(3);
      result.forEach(item => {
        expect(array).toContain(item);
      });
    });

    it('should return unique elements', () => {
      const array = [1, 2, 3, 4, 5];
      const result = getRandomElements(array, 3);
      const unique = new Set(result);
      
      expect(unique.size).toBe(3);
    });

    it('should return all elements if count >= array length', () => {
      const array = [1, 2, 3];
      const result = getRandomElements(array, 5);
      
      expect(result.length).toBe(3);
      expect(result.sort()).toEqual(array.sort());
    });

    it('should handle count of 0', () => {
      const result = getRandomElements([1, 2, 3], 0);
      expect(result.length).toBe(0);
    });
  });
});

