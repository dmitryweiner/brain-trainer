import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ServicesProvider } from '../services';
import { createWebServices } from '../webServices';
import { FakeScheduler } from '../../core/testing/fakeScheduler';
import { GAMES } from '../../core/games/registry';
import { GAME_SCREENS } from '../gameScreens';

/** A translation key that reached the screen untranslated */
const RAW_KEY = /\b(games|game|metrics|memoryMatrix|schulte|whack|trace|rotate|repeat|digits|switch|flip|hunt|flags|nback|hare|results|common)\.[a-zA-Z-]+/;

describe('every game screen', () => {
  beforeEach(() => localStorage.clear());

  for (const game of GAMES) {
    it(`${game.id}: intro, start, a few seconds of play, leave`, () => {
      const Screen = GAME_SCREENS[game.id]!;
      const scheduler = new FakeScheduler();
      const services = { ...createWebServices(), scheduler };
      const { container, unmount } = render(
        <ServicesProvider services={services}>
          <Screen onBack={() => undefined} />
        </ServicesProvider>,
      );
      expect(container.textContent).not.toMatch(RAW_KEY);

      const start = screen.queryByRole('button', { name: /Начать игру/ }) ?? screen.getAllByRole('button').find(b => /→/.test(b.textContent ?? ''))!;
      act(() => start.click());
      for (let i = 0; i < 20; i++) act(() => scheduler.advance(250));
      expect(container.textContent).not.toMatch(RAW_KEY);
      expect(container.querySelector('.game-layout')).toBeInTheDocument();

      unmount();
      expect(scheduler.pendingCount).toBe(0);
    });
  }
});
