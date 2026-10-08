import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ReactionClick } from './ReactionClick';
import { ServicesProvider } from '../../../ui/services';
import { createWebServices } from '../../../ui/webServices';
import { FakeScheduler } from '../../../core/testing/fakeScheduler';
import { activeSessions } from '../../../core/stats';
import { reachMs, REACTION_CLICK } from '../../../core/games/reactionClick/engine';

function setup() {
  const scheduler = new FakeScheduler();
  const services = { ...createWebServices(), scheduler };
  const utils = render(
    <ServicesProvider services={services}>
      <ReactionClick onBackToMenu={() => undefined} />
    </ServicesProvider>,
  );
  return { ...utils, scheduler, services };
}

/** Steps the clock until the cactus shows */
function untilCactus(container: HTMLElement, scheduler: FakeScheduler) {
  for (let i = 0; i < 1000 && !container.querySelector('.cactus.approach'); i++) act(() => scheduler.advance(10));
  expect(container.querySelector('.cactus.approach')).toBeInTheDocument();
}

const scene = (container: HTMLElement) => container.querySelector('.dino-scene')!;

describe('Dino Jump (Reaction Click)', () => {
  beforeEach(() => localStorage.clear());

  it('explains the game: jump over cacti, lives, streaks', () => {
    setup();
    expect(screen.getByText(/Когда появится кактус/)).toBeInTheDocument();
    expect(screen.getByText(/10 препятствий и 3 жизни/)).toBeInTheDocument();
    expect(screen.queryByText(/Птицу/)).not.toBeInTheDocument();
    expect(screen.getByText('Уровень 1 из 10')).toBeInTheDocument();
  });

  it('a jump before the cactus costs a life; a jump after it measures the reaction', () => {
    const { container, scheduler } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Начать игру/ }));
    expect(scene(container)).toHaveClass('running');

    fireEvent.pointerDown(scene(container));
    expect(screen.getByText(/Слишком рано|рано/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.life.lost')).toHaveLength(1);

    act(() => scheduler.advance(REACTION_CLICK.falseStartPauseMs));
    untilCactus(container, scheduler);
    act(() => scheduler.advance(240));
    fireEvent.pointerDown(scene(container));
    // the cactus showed up to one 10 ms step before we saw it
    expect(screen.getByText(/⚡ 2[45]\d мс/)).toBeInTheDocument();
    expect(container.querySelector('.dino.jump')).toBeInTheDocument();
  });

  it('too slow: the dino crashes into the cactus', () => {
    const { container, scheduler } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Начать игру/ }));
    untilCactus(container, scheduler);
    act(() => scheduler.advance(reachMs(1)));
    expect(screen.getByText('Бум! Не успели')).toBeInTheDocument();
    expect(container.querySelectorAll('.life.lost')).toHaveLength(1);
  });

  it('records one session with the distribution on the results screen', () => {
    const { container, scheduler, services } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Начать игру/ }));
    for (let i = 0; i < REACTION_CLICK.attempts; i++) {
      untilCactus(container, scheduler);
      act(() => scheduler.advance(300));
      fireEvent.pointerDown(scene(container));
      act(() => scheduler.advance(REACTION_CLICK.clickedPauseMs));
    }
    expect(activeSessions(services.repository.events)).toHaveLength(1);
    expect(screen.getByText('Распределение времени реакции')).toBeInTheDocument();
    expect(screen.getByText(/Лучшее за всё время/)).toBeInTheDocument();
  });
});
