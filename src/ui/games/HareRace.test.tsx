import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HareRace } from './HareRace';
import { ServicesProvider } from '../services';
import { createWebServices } from '../webServices';
import { FakeScheduler } from '../../core/testing/fakeScheduler';
import { activeSessions } from '../../core/stats';
import { HARE_RACE } from '../../core/games/reactionClick/engine';
import type { ToneOutput } from '../../platform/web/audio';

const PERF_NOW = 10_000;

function setup(audio?: ToneOutput) {
  const scheduler = new FakeScheduler();
  const services = { ...createWebServices(), scheduler, audio };
  const utils = render(
    <ServicesProvider services={services}>
      <HareRace onBack={() => undefined} />
    </ServicesProvider>,
  );
  return { ...utils, scheduler, services };
}

const fakeAudio = (): ToneOutput & { tone: ReturnType<typeof vi.fn>; warmUp: ReturnType<typeof vi.fn> } => ({
  tone: vi.fn(), warmUp: vi.fn(), available: () => true, latencyMs: () => 20,
});

const field = (container: HTMLElement) => container.querySelector('.hare-field') as HTMLElement;
const start = () => fireEvent.click(screen.getByRole('button', { name: /Начать игру/ }));

/** A pointerdown whose input event happened `ageMs` before now */
function tapAged(el: HTMLElement, ageMs: number) {
  const event = new Event('pointerdown', { bubbles: true });
  Object.defineProperty(event, 'timeStamp', { value: PERF_NOW - ageMs });
  fireEvent(el, event);
}

let frames: FrameRequestCallback[] = [];

describe('Hare Race', () => {
  beforeEach(() => {
    localStorage.clear();
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.spyOn(performance, 'now').mockReturnValue(PERF_NOW);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('introduces the opponent; without sound only day races can be chosen', () => {
    const { container } = setup();
    expect(screen.getByText(/Два зайца на старте/)).toBeInTheDocument();
    expect(screen.getByText('Сегодня против вас 🐰 Соня, ≈ 600 мс')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ночь/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /День и ночь/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'День' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/включите звук/)).toBeInTheDocument();

    // "day and night", the default, runs as day races
    start();
    expect(field(container)).toHaveClass('day');
    expect(screen.getByText('Ждите флажка…')).toBeInTheDocument();
  });

  it('times the reaction from the frame that showed the flag to the input event of the tap', () => {
    const { container, scheduler } = setup();
    start();
    for (let i = 0; i < 1000 && !field(container).classList.contains('flag-up'); i++) act(() => scheduler.advance(10));
    expect(field(container)).toHaveClass('flag-up');
    expect(frames).toHaveLength(1);

    // the frame came 16 ms after the timer; the tap was handled 30 ms after it happened
    act(() => scheduler.advance(16));
    act(() => frames[0](PERF_NOW));
    act(() => scheduler.advance(330));
    tapAged(field(container), 30);
    expect(screen.getByText(/^300 мс — морковка ваша!$/)).toBeInTheDocument();
    expect(screen.getByText('Вы 300 мс · Соня', { exact: false })).toBeInTheDocument();
  });

  it('a night race changes nothing on the field until the tap; the whistle is the signal', () => {
    const audio = fakeAudio();
    const { container, scheduler } = setup(audio);
    fireEvent.click(screen.getByRole('button', { name: /Ночь/ }));
    start();
    expect(audio.warmUp).toHaveBeenCalled();
    expect(field(container)).toHaveClass('night');
    expect(screen.getByText('Слушайте свисток…')).toBeInTheDocument();

    let before = field(container).outerHTML;
    for (let i = 0; i < 1000 && audio.tone.mock.calls.length === 0; i++) {
      before = field(container).outerHTML;
      act(() => scheduler.advance(10));
    }
    expect(audio.tone).toHaveBeenCalledWith(1000, 80, 2);
    expect(field(container).outerHTML).toBe(before);

    // the sound reaches the speaker 20 ms after it is started
    act(() => scheduler.advance(270));
    fireEvent.pointerDown(field(container));
    expect(screen.getByText(/^250 мс/)).toBeInTheDocument();
    expect(field(container)).toHaveClass('finish', 'flag-up');
  });

  it('a tap before the signal is a false start; held keys do not repeat', () => {
    const { container } = setup();
    start();
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    expect(screen.getByText('Ждите флажка…')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByText('Фальстарт!')).toBeInTheDocument();
    expect(field(container).querySelector('.hare-lane.you')).toHaveClass('sleeper');
  });

  it('records one session and shows the races on the results screen', () => {
    const { container, scheduler, services } = setup();
    start();
    for (let i = 0; i < HARE_RACE.races; i++) {
      for (let j = 0; j < 1000 && !field(container).classList.contains('flag-up'); j++) act(() => scheduler.advance(10));
      act(() => scheduler.advance(300));
      fireEvent.pointerDown(field(container));
      act(() => scheduler.advance(HARE_RACE.reviewMs));
    }
    expect(activeSessions(services.repository.events)).toHaveLength(1);
    expect(screen.getByText(/Побед 10 из 10/)).toBeInTheDocument();
    expect(screen.getByText('🏆 Чемпион леса!')).toBeInTheDocument();
    expect(screen.getByText('☀️ Днём')).toBeInTheDocument();
    expect(screen.getByText('Распределение времени реакции')).toBeInTheDocument();
    expect(container.ownerDocument.querySelectorAll('.hare-races li')).toHaveLength(10);
  });
});
