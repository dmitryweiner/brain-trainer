import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createWebServices, type AppServices } from './webServices';
import { FakeScheduler } from '../core/testing/fakeScheduler';
import { SCHEMA_VERSION, type GameId, type GameSession } from '../core/types';
import { dayKey } from '../core/stats';
import { dailyWorkout } from '../core/stats/engagement';
import { GAMES } from '../core/games/registry';
import { ODD_ONE_OUT } from '../core/games/oddOneOut/engine';

let n = 0;
function session(gameId: GameId, startedAt = Date.now() - 60_000, over: Partial<GameSession> = {}): GameSession {
  n++;
  return {
    id: `u${n}`, gameId, schemaVersion: SCHEMA_VERSION, startedAt, durationMs: 1000, level: 1, score: 1, rating: 0,
    accuracy: 70, avgTimeMs: 0, metrics: {}, ...over,
  };
}

function setup(extra: Partial<AppServices> = {}) {
  const scheduler = new FakeScheduler();
  const services: AppServices = { ...createWebServices(), scheduler, ...extra };
  const utils = render(<App services={services} />);
  return { ...utils, services, scheduler };
}

function playOddOneOutPerfectly(container: HTMLElement, scheduler: FakeScheduler) {
  fireEvent.click(screen.getByRole('button', { name: /Начать игру/ }));
  for (let i = 0; i < ODD_ONE_OUT.rounds; i++) {
    const cells = [...container.querySelectorAll<HTMLButtonElement>('.emoji-cell')];
    const counts = new Map<string, number>();
    cells.forEach(c => counts.set(c.textContent!, (counts.get(c.textContent!) ?? 0) + 1));
    act(() => scheduler.advance(400));
    fireEvent.click(cells.find(c => counts.get(c.textContent!) === 1)!);
    act(() => scheduler.advance(ODD_ONE_OUT.feedbackMs));
  }
}

describe('daily workout', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('shows today\'s four games and starts the first open one', async () => {
    const { services } = setup();
    const plan = dailyWorkout(dayKey(services.clock.wallNow()), GAMES);
    const block = screen.getByRole('region', { name: /Тренировка дня/ });
    expect(within(block).getAllByRole('listitem')).toHaveLength(4);
    await userEvent.click(within(block).getByRole('button', { name: 'Начать тренировку' }));
    expect(window.location.hash).toBe(`#${plan[0]}`);
  });

  it('counts a day done when every slot was played, and shows the streak', () => {
    const base = createWebServices();
    const today = Date.now() - 60_000;
    for (const id of ['memory-flip', 'schulte', 'maze', 'whack-a-mole'] as GameId[]) base.repository.addSession(session(id, today));
    render(<App services={{ ...base, scheduler: new FakeScheduler() }} />);
    const block = screen.getByRole('region', { name: /Тренировка дня/ });
    expect(within(block).getByText(/выполнена/)).toBeInTheDocument();
    expect(within(block).getByText('🔥 1 дн. подряд')).toBeInTheDocument();
  });

  it('"next game" in a workout goes to the next open slot', async () => {
    const base = createWebServices();
    const today = base.clock.wallNow();
    const plan = dailyWorkout(dayKey(today), GAMES);
    // everything but the attention slot is done: the workout leads to it
    for (const id of ['memory-flip', 'whack-a-mole', 'maze'] as GameId[]) base.repository.addSession(session(id, today - 60_000));
    const scheduler = new FakeScheduler();
    const { container } = render(<App services={{ ...base, scheduler }} />);
    await userEvent.click(screen.getByRole('button', { name: /Продолжить/ }));
    expect(window.location.hash).toBe(`#${plan[1]}`);
    expect(container.querySelector('.game-layout')).toBeInTheDocument();
  });
});

describe('feedback, records and achievements', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('plays engine cues and lists the achievements a session unlocked', () => {
    const play = vi.fn();
    window.location.hash = 'odd-one-out';
    const { container, scheduler } = setup({ feedback: { play } });
    playOddOneOutPerfectly(container, scheduler);

    expect(play).toHaveBeenCalledWith('good');
    expect(play).not.toHaveBeenCalledWith('bad');
    // a first session is not a record; achievements: first game
    expect(play).not.toHaveBeenCalledWith('record');
    expect(screen.getByText('Первый шаг')).toBeInTheDocument();
  });

  it('a better result is a record: fanfare and confetti', () => {
    const play = vi.fn();
    const base = createWebServices();
    base.repository.addSession(session('odd-one-out', Date.now() - 3_600_000, { accuracy: 50, metrics: { correct: 5, rules: 2 } }));
    window.location.hash = 'odd-one-out';
    const scheduler = new FakeScheduler();
    const { container } = render(<App services={{ ...base, scheduler, feedback: { play } }} />);
    playOddOneOutPerfectly(container, scheduler);
    expect(screen.getByText(/Новый рекорд/)).toBeInTheDocument();
    expect(container.ownerDocument.querySelector('.confetti')).toBeInTheDocument();
    expect(play).toHaveBeenCalledWith('record');
    expect(play.mock.calls.filter(c => c[0] === 'record')).toHaveLength(1);
  });

  it('profile lists achievements and switches sound and vibration', async () => {
    const base = createWebServices();
    base.repository.addSession(session('n-back'));
    const user = userEvent.setup();
    render(<App services={{ ...base, scheduler: new FakeScheduler() }} />);
    await user.click(screen.getByRole('button', { name: 'Профиль' }));
    await user.click(screen.getByRole('button', { name: 'Достижения' }));
    expect(screen.getByText(/Получено 1 из 12/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    const sound = screen.getByRole('checkbox', { name: /Звук/ });
    expect(sound).toBeChecked();
    await user.click(sound);
    expect(base.prefs.get().sound).toBe(false);
    expect(JSON.parse(localStorage.getItem('brain-trainer-prefs')!)).toMatchObject({ sound: false, vibration: true });
  });
});
