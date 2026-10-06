import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ReactionClick } from './ReactionClick';
import { ServicesProvider } from '../../../ui/services';
import { createWebServices } from '../../../ui/webServices';
import { FakeScheduler } from '../../../core/testing/fakeScheduler';
import { activeSessions } from '../../../core/stats';
import { REACTION_CLICK } from '../../../core/games/reactionClick/engine';

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

/** Steps the clock until the green signal shows */
function untilReady(container: HTMLElement, scheduler: FakeScheduler) {
  for (let i = 0; i < 1000 && !container.querySelector('.reaction-ready'); i++) act(() => scheduler.advance(10));
  expect(container.querySelector('.reaction-ready')).toBeInTheDocument();
}

describe('ReactionClick', () => {
  beforeEach(() => localStorage.clear());

  it('explains the rules: green only, lives, streaks', () => {
    setup();
    expect(screen.getByText('Ждите, пока экран станет зелёным.')).toBeInTheDocument();
    expect(screen.getByText(/10 попыток и 3 жизни/)).toBeInTheDocument();
    expect(screen.queryByText(/обманка/)).not.toBeInTheDocument();
    expect(screen.getByText('Уровень 1 из 10')).toBeInTheDocument();
  });

  it('plays: wait, signal, tap, and a false start costs a life', () => {
    const { container, scheduler } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Начать игру/ }));
    expect(container.querySelector('.reaction-waiting')).toBeInTheDocument();
    expect(screen.getAllByText(/1.*\/.*10/).length).toBeGreaterThan(0);

    // tap too early
    fireEvent.pointerDown(container.querySelector('.reaction-waiting')!);
    expect(container.querySelector('.reaction-too-early')).toBeInTheDocument();
    expect(container.querySelectorAll('.life.lost')).toHaveLength(1);

    act(() => scheduler.advance(REACTION_CLICK.falseStartPauseMs));
    untilReady(container, scheduler);
    act(() => scheduler.advance(240));
    fireEvent.pointerDown(container.querySelector('.reaction-ready')!);
    // the signal showed up to one 10 ms step before we saw it
    expect(screen.getByText(/^2[45]\d мс$/)).toBeInTheDocument();
  });

  it('records one session with the distribution on the results screen', () => {
    const { container, scheduler, services } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Начать игру/ }));
    for (let i = 0; i < REACTION_CLICK.attempts; i++) {
      untilReady(container, scheduler);
      act(() => scheduler.advance(300));
      fireEvent.pointerDown(container.querySelector('.reaction-ready')!);
      act(() => scheduler.advance(REACTION_CLICK.clickedPauseMs));
    }
    expect(activeSessions(services.repository.events)).toHaveLength(1);
    expect(screen.getByText('Распределение времени реакции')).toBeInTheDocument();
    expect(screen.getByText(/Лучшее за всё время/)).toBeInTheDocument();
  });
});
