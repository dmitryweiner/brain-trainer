import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ScoreProvider, useScoreContext } from './ScoreContext';
import { useGameHistory } from '../hooks/useGameHistory';
import { ServicesProvider, useServices } from '../ui/services';
import { createWebServices } from '../ui/webServices';
import { GAME_IDS } from '../utils/constants';
import React from 'react';

describe('ScoreContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should throw error when used outside provider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useScoreContext());
    }).toThrow('useScoreContext must be used within a ScoreProvider');
    consoleErrorSpy.mockRestore();
  });

  it('works without the app shell', () => {
    const { result } = renderHook(() => useScoreContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <ScoreProvider>{children}</ScoreProvider>,
    });
    expect(result.current.totalScore).toBe(0);
  });

  it('reflects sessions recorded through the shared services', () => {
    const services = createWebServices();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ServicesProvider services={services}>
        <ScoreProvider>{children}</ScoreProvider>
      </ServicesProvider>
    );
    const { result } = renderHook(() => {
      const s = useServices();
      return { score: useScoreContext(), history: useGameHistory(s.repository, s.clock) };
    }, { wrapper });

    act(() => {
      result.current.history.addGameResult({ gameId: GAME_IDS.REACTION_CLICK, score: 15, accuracy: 100, averageTime: 250 });
    });

    expect(result.current.score.totalScore).toBe(15);
    expect(result.current.score.getGameScore(GAME_IDS.REACTION_CLICK)).toBe(15);
  });
});
