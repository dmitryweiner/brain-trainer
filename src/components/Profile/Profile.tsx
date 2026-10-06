import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameHistoryContext } from '../../context/GameHistoryContext';
import { useScoreContext } from '../../context/ScoreContext';
import { GAMES_META } from '../../utils/constants';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { SyncPanel } from '../../ui/SyncPanel';
import { useOptionalServices } from '../../ui/services';
import { ActivityCalendar, HorizontalBars } from '../../ui/charts/charts';
import { GAMES } from '../../core/games/registry';
import { activityCalendar, categoryIndex, dayStart, streakDays, trainingTimeMs } from '../../core/stats';
import type { GameCategory } from '../../core/types';
import type { GameId } from '../../types/game.types';
import { GamePage } from './GamePage';
import './Profile.scss';

export interface ProfileProps {
  onBack: () => void;
}

type TabType = 'overview' | 'daily' | 'games' | 'sync';

const CATEGORIES: readonly GameCategory[] = ['memory', 'attention', 'reaction', 'spatial', 'knowledge'];

export const Profile: React.FC<ProfileProps> = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const { sessions, getDailyStats, getGameStats, getGameLevel, clearHistory, resetGame } = useGameHistoryContext();
  const { totalScore } = useScoreContext();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const services = useOptionalServices();
  const sync = services?.sync;
  const now = services?.clock.wallNow() ?? Date.now();

  const dailyStats = getDailyStats(14); // Last 14 days
  const totalGames = sessions.length;
  const maxDailyGames = Math.max(...dailyStats.map(d => d.gamesPlayed), 1);
  const fmtDay = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(dayStart(key)).toLocaleDateString(i18n.language, opts);

  const renderOverview = () => {
    if (totalGames === 0) {
      return (
        <div className="profile-overview">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>{t('profile.noData')}</p>
          </div>
        </div>
      );
    }
    const index = categoryIndex(sessions, GAMES);
    const categories = CATEGORIES.filter(c => GAMES.some(g => g.category === c));
    const minutes = Math.round(trainingTimeMs(sessions) / 60_000);
    const calendar = activityCalendar(sessions, now, 4).map(day => ({
      ...day,
      label: t('profile.calendarDay', { date: fmtDay(day.date, { day: 'numeric', month: 'long' }), count: day.sessions }),
    }));
    return (
      <div className="profile-overview">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-value">{streakDays(sessions, now)}</div>
            <div className="stat-label">{t('profile.streak')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-value">{totalGames}</div>
            <div className="stat-label">{t('profile.sessionsTotal')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-value">{t('profile.minutes', { count: minutes })}</div>
            <div className="stat-label">{t('profile.trainingTime')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-value">{totalScore}</div>
            <div className="stat-label">{t('profile.totalScore')}</div>
          </div>
        </div>

        <section className="chart-section">
          <h3>{t('profile.categoryIndex')}</h3>
          <p className="chart-hint">{t('profile.categoryHint')}</p>
          <HorizontalBars rows={categories.map(c => ({ key: c, label: t(`categories.${c}`), value: index[c] }))} />
        </section>

        <section className="chart-section">
          <ActivityCalendar days={calendar} weekdays={t('profile.weekdays').split(',')} caption={t('profile.calendar')} />
        </section>

        <div className="reset-section">
          <button className="reset-all-btn" onClick={() => setConfirmClear(true)}>
            🗑️ {t('profile.resetAll')}
          </button>
        </div>
      </div>
    );
  };

  const renderDailyStats = () => (
    <div className="profile-daily">
      {dailyStats.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>{t('profile.noData')}</p>
        </div>
      ) : (
        <div className="daily-list">
          {dailyStats.map((day) => (
            <div key={day.date} className="daily-card">
              <div className="daily-header">
                <div className="daily-date">
                  {fmtDay(day.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="daily-games-count">
                  {day.gamesPlayed} {t('profile.games')}
                </div>
              </div>
              <div className="daily-stats">
                <div className="daily-stat">
                  <span className="label">{t('profile.score')}:</span>
                  <span className="value">{day.totalScore}</span>
                </div>
                <div className="daily-stat">
                  <span className="label">{t('profile.accuracy')}:</span>
                  <span className="value">{Math.round(day.averageAccuracy)}%</span>
                </div>
              </div>
              <div className="daily-progress">
                <div className="progress-fill" style={{ width: `${(day.gamesPlayed / maxDailyGames) * 100}%` }} />
              </div>
              <div className="daily-breakdown">
                {Object.entries(day.gameBreakdown).map(([gameId, data]) => {
                  const gameMeta = GAMES_META.find(g => g.id === gameId);
                  return (
                    <span key={gameId} className="breakdown-item">
                      {gameMeta?.icon} {data.count}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderGamesStats = () => {
    if (selectedGame) {
      return (
        <GamePage
          gameId={selectedGame}
          sessions={sessions}
          level={getGameLevel(selectedGame)}
          now={now}
          onBack={() => setSelectedGame(null)}
          onReset={resetGame}
        />
      );
    }
    return (
      <div className="profile-games">
        <div className="games-list">
          {GAMES_META.map((game) => {
            const stats = getGameStats(game.id);
            return (
              <button key={game.id} className="game-stat-card" onClick={() => setSelectedGame(game.id)}>
                <div className="game-stat-header">
                  <div className="game-info">
                    <span className="game-icon">{game.icon}</span>
                    <span className="game-name">{t(`games.${game.id}.title`, { defaultValue: game.title })}</span>
                  </div>
                  <div className="game-quick-stats">
                    {stats.totalGames > 0 ? (
                      <>
                        <span className="best">{t('profile.gamePage.bestRating')}: {stats.bestRating}</span>
                        <span className="played">{stats.totalGames} {t('profile.played')}</span>
                        {stats.recentTrend === 'improving' && <span className="trend up" aria-label={t('profile.trends.improving')}>↑</span>}
                        {stats.recentTrend === 'declining' && <span className="trend down" aria-label={t('profile.trends.declining')}>↓</span>}
                      </>
                    ) : (
                      <span className="played">{t('profile.notPlayedYet')}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const tab = (id: TabType, label: string) => (
    <button
      className={`tab ${activeTab === id ? 'active' : ''}`}
      onClick={() => {
        setActiveTab(id);
        setSelectedGame(null);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-btn" onClick={onBack}>
          ← {t('app.back')}
        </button>
        <h1>{t('profile.title')}</h1>
        {totalGames > 0 && (
          <button className="clear-btn" onClick={() => setConfirmClear(true)}>
            🗑️
          </button>
        )}
      </div>

      <div className="profile-tabs">
        {tab('overview', t('profile.tabs.overview'))}
        {tab('daily', t('profile.tabs.daily'))}
        {tab('games', t('profile.tabs.games'))}
        {sync && tab('sync', t('profile.tabs.sync'))}
      </div>

      <div className="profile-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'daily' && renderDailyStats()}
        {activeTab === 'games' && renderGamesStats()}
        {activeTab === 'sync' && sync && <SyncPanel sync={sync} />}
      </div>

      <ConfirmDialog
        open={confirmClear}
        danger
        title={t('profile.clearTitle')}
        message={t('profile.confirmClear')}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          clearHistory();
        }}
      />
    </div>
  );
};

export default Profile;
