import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ServicesProvider } from './services';
import { createWebServices, type AppServices } from './webServices';
import { FakeScheduler } from '../core/testing/fakeScheduler';
import { activeSessions } from '../core/stats';
import { OddOneOut } from '../components/games/OddOneOut';
import { ODD_ONE_OUT } from '../core/games/oddOneOut/engine';

function setup() {
  const scheduler = new FakeScheduler();
  const services: AppServices = { ...createWebServices(), scheduler };
  const utils = render(
    <ServicesProvider services={services}>
      <OddOneOut onBackToMenu={() => undefined} />
    </ServicesProvider>,
  );
  return { ...utils, services, scheduler };
}

function playRound(container: HTMLElement, scheduler: FakeScheduler) {
  const cells = container.querySelectorAll<HTMLButtonElement>('.emoji-cell');
  const counts = new Map<string, number>();
  cells.forEach(c => counts.set(c.textContent!, (counts.get(c.textContent!) ?? 0) + 1));
  const odd = [...cells].find(c => counts.get(c.textContent!) === 1)!;
  act(() => {
    scheduler.advance(400);
    fireEvent.click(odd);
  });
  act(() => scheduler.advance(ODD_ONE_OUT.feedbackMs));
}

describe('GameShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('plays a session on the engine and records it exactly once', () => {
    const { container, services, scheduler } = setup();
    fireEvent.click(screen.getByRole('button', { name: /начать игру/i }));

    for (let i = 0; i < ODD_ONE_OUT.rounds; i++) playRound(container, scheduler);

    expect(screen.getByText(/Игра завершена|Game Over/i)).toBeInTheDocument();
    const sessions = activeSessions(services.repository.events);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      gameId: 'odd-one-out', level: 1, accuracy: 100, avgTimeMs: 400, score: 3 * 3 + 4 * 4 + 3 * 5,
      metrics: { correct: 10, rounds: 10, maxGridSize: 5 },
    });
    // Odd One Out v1 maximum is 40 points
    expect(sessions[0].rating).toBe(1000);
  });

  it('starts a fresh session on "play again"', () => {
    const { container, services, scheduler } = setup();
    fireEvent.click(screen.getByRole('button', { name: /начать игру/i }));
    for (let i = 0; i < ODD_ONE_OUT.rounds; i++) playRound(container, scheduler);

    fireEvent.click(screen.getByRole('button', { name: /Играть снова|Ещё раз|Play again/i }));
    expect(container.querySelectorAll('.emoji-cell')).toHaveLength(9);
    expect(screen.queryByText(/Игра завершена/i)).not.toBeInTheDocument();
    expect(activeSessions(services.repository.events)).toHaveLength(1);
  });

  it('stops the engine when the game is left mid-session', () => {
    const { container, scheduler, unmount } = setup();
    fireEvent.click(screen.getByRole('button', { name: /начать игру/i }));
    fireEvent.click(container.querySelector('.emoji-cell')!);
    expect(scheduler.pendingCount).toBe(1);
    unmount();
    expect(scheduler.pendingCount).toBe(0);
  });
});
