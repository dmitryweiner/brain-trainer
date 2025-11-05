import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useHiddenNumber from './useHiddenNumber';

describe('useHiddenNumber', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useHiddenNumber());

    expect(result.current.status).toBe('intro');
    expect(result.current.currentRound).toBe(0);
    expect(result.current.times).toEqual([]);
    expect(result.current.currentScore).toBe(0);
  });

  it('should provide required functions', () => {
    const { result } = renderHook(() => useHiddenNumber());

    expect(typeof result.current.startGame).toBe('function');
    expect(typeof result.current.handleCellClick).toBe('function');
    expect(typeof result.current.playAgain).toBe('function');
  });

  it('should change to playing when game starts', () => {
    const { result } = renderHook(() => useHiddenNumber());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.status).toBe('playing');
  });

  it('should set target position and number', () => {
    const { result } = renderHook(() => useHiddenNumber());

    act(() => {
      result.current.startGame();
    });

    expect(result.current.targetPosition).toBeGreaterThanOrEqual(0);
    expect(result.current.targetPosition).toBeLessThan(result.current.totalCells);
    expect(result.current.targetNumber).toBeGreaterThanOrEqual(1);
    expect(result.current.targetNumber).toBeLessThanOrEqual(9);
  });

  it('should handle correct cell click', () => {
    const { result } = renderHook(() => useHiddenNumber());

    act(() => {
      result.current.startGame();
    });

    const correctIndex = result.current.targetPosition;

    act(() => {
      result.current.handleCellClick(correctIndex);
    });

    expect(result.current.currentRound).toBe(1);
    expect(result.current.times.length).toBe(1);
    expect(result.current.currentScore).toBeGreaterThan(0);
  });

  it('should ignore incorrect cell click', () => {
    const { result } = renderHook(() => useHiddenNumber());

    act(() => {
      result.current.startGame();
    });

    const correctIndex = result.current.targetPosition;
    const wrongIndex = (correctIndex + 1) % result.current.totalCells;

    act(() => {
      result.current.handleCellClick(wrongIndex);
    });

    expect(result.current.currentRound).toBe(0);
    expect(result.current.times.length).toBe(0);
  });

  it('should reset on play again', () => {
    const { result } = renderHook(() => useHiddenNumber());

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.handleCellClick(result.current.targetPosition);
    });

    act(() => {
      result.current.playAgain();
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.currentRound).toBe(0);
    expect(result.current.times).toEqual([]);
  });

  it('should have correct grid size', () => {
    const { result } = renderHook(() => useHiddenNumber());

    expect(result.current.gridSize.rows).toBe(5);
    expect(result.current.gridSize.cols).toBe(6);
    expect(result.current.totalCells).toBe(30);
  });
});

