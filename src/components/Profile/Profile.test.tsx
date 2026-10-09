import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profile } from './Profile';
import { ServicesProvider } from '../../ui/services';
import { createWebServices } from '../../ui/webServices';
import { ScoreProvider } from '../../context/ScoreContext';
import { GameHistoryProvider } from '../../context/GameHistoryContext';
import { activeSessions } from '../../core/stats';
import { SCHEMA_VERSION, type GameSession } from '../../core/types';

let n = 0;
function session(over: Partial<GameSession>): GameSession {
  n++;
  return {
    id: `p-${n}`, gameId: 'odd-one-out', schemaVersion: SCHEMA_VERSION, startedAt: Date.now() - n * 60_000, durationMs: 90_000,
    level: 2, score: 30, rating: 0, accuracy: 90, avgTimeMs: 1200, metrics: { correct: 9, rounds: 10, maxGridSize: 4, rules: 2 }, ...over,
  };
}

function setup(sessions: GameSession[]) {
  const services = createWebServices();
  for (const s of sessions) services.repository.addSession(s);
  render(
    <ServicesProvider services={services}>
      <ScoreProvider>
        <GameHistoryProvider>
          <Profile onBack={() => undefined} />
        </GameHistoryProvider>
      </ScoreProvider>
    </ServicesProvider>,
  );
  return services;
}

describe('Profile', () => {
  beforeEach(() => localStorage.clear());

  it('shows streak, totals, category index and the activity calendar', () => {
    setup([session({}), session({ gameId: 'reaction-click', metrics: { hits: 5 }, avgTimeMs: 600 })]);
    // the streak counts days with the daily workout done; two games are not a workout
    expect(screen.getByText('Серия тренировок').previousSibling).toHaveTextContent('0');
    expect(screen.getByText('Всего игр').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('Время тренировок').previousSibling).toHaveTextContent('3 мин');
    // odd-one-out: 90% accuracy at level 2, quick → 0.9 × 520 = 468; reaction: 5/5 at 600 ms, level 2 → 0.5 × 1000 × 0.88 = 440
    const bars = screen.getByText('Индекс по категориям').parentElement!;
    expect(within(bars).getByText('Внимание').nextSibling).toHaveTextContent('468');
    expect(within(bars).getByText('Реакция').nextSibling).toHaveTextContent('440');
    expect(screen.getAllByRole('gridcell')).toHaveLength(28);
  });

  it('opens a game page with chart, bests, sessions and level', async () => {
    const user = userEvent.setup();
    setup([session({ rating: 1 }), session({ accuracy: 50 })]);
    await user.click(screen.getByRole('button', { name: 'Игры' }));
    await user.click(screen.getByRole('button', { name: /Найди лишний/ }));

    expect(screen.getByRole('heading', { name: /Найди лишний/ })).toBeInTheDocument();
    expect(screen.getByText(/Текущий уровень: 3 из 10/)).toBeInTheDocument();
    expect(screen.getByText('Верных ответов')).toBeInTheDocument();
    expect(screen.queryByText('rules')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Неделя' }));
    expect(screen.getByRole('button', { name: 'Неделя' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '← Все игры' }));
    expect(screen.getByRole('button', { name: /Заячьи гонки/ })).toBeInTheDocument();
  });

  it('resets one game after confirmation', async () => {
    const user = userEvent.setup();
    const services = setup([session({}), session({ gameId: 'n-back', metrics: {} })]);
    await user.click(screen.getByRole('button', { name: 'Игры' }));
    await user.click(screen.getByRole('button', { name: /Найди лишний/ }));
    await user.click(screen.getByRole('button', { name: /Сбросить статистику этой игры/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Подтвердить' }));
    expect(activeSessions(services.repository.events).map(s => s.gameId)).toEqual(['n-back']);
  });
});
