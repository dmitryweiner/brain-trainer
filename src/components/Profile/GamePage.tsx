import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameId, GameSession } from '../../core/types';
import { getGame } from '../../core/games/registry';
import { dayKey, dayStart, gameStats } from '../../core/stats';
import { RatingTimeline } from '../../ui/charts/charts';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

type Period = 'week' | 'month' | 'all';
const PERIOD_DAYS: Record<Period, number | null> = { week: 7, month: 30, all: null };

/** Metrics stored only to version the rules; not worth showing */
const HIDDEN_METRICS = new Set(['rules']);

export interface GamePageProps {
  gameId: GameId;
  sessions: readonly GameSession[];
  level: number;
  now: number;
  onBack: () => void;
  onReset: (gameId: GameId) => void;
}

/** One game in detail (PLAN-IMPROVEMENTS.md, 4.2). */
export const GamePage: React.FC<GamePageProps> = ({ gameId, sessions, level, now, onBack, onReset }) => {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<Period>('month');
  const [confirmReset, setConfirmReset] = useState(false);
  const game = getGame(gameId);
  const title = t(`games.${gameId}.title`);
  const leveled = game.maxLevel > game.minLevel;

  const mine = useMemo(() => sessions.filter(s => s.gameId === gameId), [sessions, gameId]);
  const stats = useMemo(() => gameStats(mine, gameId), [mine, gameId]);
  const fmtDate = (ms: number, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
    new Date(ms).toLocaleDateString(i18n.language, opts);

  const { points, daily } = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const from = days === null ? -Infinity : now - days * 86_400_000;
    const inPeriod = mine.filter(s => s.startedAt >= from);
    const byDay = new Map<string, number[]>();
    for (const s of inPeriod) byDay.set(dayKey(s.startedAt), [...(byDay.get(dayKey(s.startedAt)) ?? []), s.rating]);
    return {
      points: inPeriod.map(s => ({
        at: s.startedAt,
        value: s.rating,
        label: t('profile.gamePage.sessionTooltip', { date: fmtDate(s.startedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), value: s.rating }),
      })),
      daily: [...byDay].map(([key, ratings]) => {
        const value = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
        // a day's point sits at its middle so it lines up with that day's dots
        return { at: dayStart(key) + 43_200_000, value, label: `${fmtDate(dayStart(key))}: ${value}` };
      }).sort((a, b) => a.at - b.at),
    };
    // fmtDate depends only on the language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, period, now, t, i18n.language]);

  const bestMetrics = Object.entries(stats.bestMetrics).filter(([k]) => !HIDDEN_METRICS.has(k) && i18n.exists(`metrics.${k}`));
  const recent = [...mine].reverse().slice(0, 10);

  return (
    <div className="game-page">
      <button className="back-link" onClick={onBack}>{t('profile.gamePage.back')}</button>
      <h2 className="game-page-title">{game.icon} {title}</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.bestRating}</div>
          <div className="stat-label">{t('profile.gamePage.bestRating')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.last?.rating ?? '—'}</div>
          <div className="stat-label">{t('profile.gamePage.lastRating')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalGames}</div>
          <div className="stat-label">{t('profile.gamePage.played')}</div>
        </div>
      </div>

      {leveled && (
        <div className="game-page-level">
          <strong>{t('profile.gamePage.currentLevel', { level, max: game.maxLevel })}</strong>
          <span>{t('profile.gamePage.levelRule')}</span>
        </div>
      )}

      <section className="chart-section">
        <div className="chart-header">
          <h3>{t('profile.gamePage.chart')}</h3>
          <div className="period-switch" role="group" aria-label={t('profile.gamePage.chart')}>
            {(['week', 'month', 'all'] as const).map(p => (
              <button key={p} className={p === period ? 'active' : ''} aria-pressed={p === period} onClick={() => setPeriod(p)}>
                {t(`profile.gamePage.${p}`)}
              </button>
            ))}
          </div>
        </div>
        <RatingTimeline
          sessions={points}
          daily={daily}
          legend={{ sessions: t('profile.gamePage.legendSessions'), daily: t('profile.gamePage.legendDaily') }}
          emptyText={t('profile.gamePage.noSessionsInPeriod')}
        />
      </section>

      {bestMetrics.length > 0 && (
        <section className="chart-section">
          <h3>{t('profile.gamePage.bestMetrics')}</h3>
          <dl className="best-metrics">
            {bestMetrics.map(([k, v]) => (
              <div key={k}>
                <dt>{t(`metrics.${k}`)}</dt>
                <dd>{k.endsWith('Ms') ? `${v} ${t('common.ms')}` : k === 'maxGridSize' ? `${v}×${v}` : v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {recent.length > 0 && (
        <section className="chart-section">
          <h3>{t('profile.gamePage.recentSessions')}</h3>
          <table className="sessions-table">
            <thead>
              <tr>
                <th scope="col">{t('profile.gamePage.date')}</th>
                <th scope="col">{t('profile.gamePage.rating')}</th>
                <th scope="col">{t('profile.gamePage.accuracy')}</th>
                {leveled && <th scope="col">{t('profile.gamePage.level')}</th>}
              </tr>
            </thead>
            <tbody>
              {recent.map(s => (
                <tr key={s.id}>
                  <td>{fmtDate(s.startedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{s.rating}</td>
                  <td>{s.accuracy}%</td>
                  {leveled && <td>{s.level}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {stats.totalGames > 0 && (
        <div className="reset-section">
          <button className="reset-all-btn" onClick={() => setConfirmReset(true)}>🗑️ {t('profile.gamePage.reset')}</button>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        danger
        title={t('profile.gamePage.resetTitle')}
        message={t('profile.gamePage.resetText', { game: title })}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          onReset(gameId);
        }}
      />
    </div>
  );
};

export default GamePage;
