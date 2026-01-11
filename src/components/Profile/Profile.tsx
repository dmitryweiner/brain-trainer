import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameHistoryContext } from '../../context/GameHistoryContext';
import { GAMES_META } from '../../utils/constants';
import type { GameId } from '../../types/game.types';
import './Profile.scss';

export interface ProfileProps {
  onBack: () => void;
}

type TabType = 'overview' | 'daily' | 'games';

export const Profile: React.FC<ProfileProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { history, getDailyStats, getGameStats, clearHistory } = useGameHistoryContext();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);

  const dailyStats = getDailyStats(14); // Last 14 days
  const totalGames = history.length;
  const totalScore = history.reduce((sum, r) => sum + r.score, 0);
  const avgAccuracy = totalGames > 0 
    ? Math.round(history.reduce((sum, r) => sum + r.accuracy, 0) / totalGames) 
    : 0;

  // Get max score for bar chart scaling
  const maxDailyScore = Math.max(...dailyStats.map(d => d.totalScore), 1);
  const maxDailyGames = Math.max(...dailyStats.map(d => d.gamesPlayed), 1);

  const handleClearHistory = () => {
    if (window.confirm(t('profile.confirmClear'))) {
      clearHistory();
    }
  };

  const renderOverview = () => (
    <div className="profile-overview">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-value">{totalGames}</div>
          <div className="stat-label">{t('profile.totalGames')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{totalScore}</div>
          <div className="stat-label">{t('profile.totalScore')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{avgAccuracy}%</div>
          <div className="stat-label">{t('profile.avgAccuracy')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{dailyStats.length}</div>
          <div className="stat-label">{t('profile.activeDays')}</div>
        </div>
      </div>

      {dailyStats.length > 0 && (
        <div className="chart-section">
          <h3>{t('profile.recentActivity')}</h3>
          <div className="bar-chart">
            {dailyStats.slice(0, 7).reverse().map((day) => (
              <div key={day.date} className="bar-item">
                <div className="bar-container">
                  <div 
                    className="bar score-bar"
                    style={{ height: `${(day.totalScore / maxDailyScore) * 100}%` }}
                    title={`${t('profile.score')}: ${day.totalScore}`}
                  />
                </div>
                <div className="bar-label">
                  {new Date(day.date).toLocaleDateString(undefined, { 
                    weekday: 'short' 
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalGames === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>{t('profile.noData')}</p>
        </div>
      )}

      {totalGames > 0 && (
        <div className="reset-section">
          <button className="reset-all-btn" onClick={handleClearHistory}>
            🗑️ {t('profile.resetAll')}
          </button>
        </div>
      )}
    </div>
  );

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
                  {new Date(day.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
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
                <div 
                  className="progress-fill"
                  style={{ width: `${(day.gamesPlayed / maxDailyGames) * 100}%` }}
                />
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

  const renderGamesStats = () => (
    <div className="profile-games">
      <div className="games-list">
        {GAMES_META.map((game) => {
          const stats = getGameStats(game.id);
          const isSelected = selectedGame === game.id;
          
          return (
            <div 
              key={game.id}
              className={`game-stat-card ${isSelected ? 'expanded' : ''}`}
              onClick={() => setSelectedGame(isSelected ? null : game.id)}
            >
              <div className="game-stat-header">
                <div className="game-info">
                  <span className="game-icon">{game.icon}</span>
                  <span className="game-name">
                    {t(`games.${game.id}.title`, { defaultValue: game.title })}
                  </span>
                </div>
                <div className="game-quick-stats">
                  <span className="played">{stats.totalGames} {t('profile.played')}</span>
                  {stats.recentTrend === 'improving' && <span className="trend up">↑</span>}
                  {stats.recentTrend === 'declining' && <span className="trend down">↓</span>}
                </div>
              </div>
              
              {isSelected && stats.totalGames > 0 && (
                <div className="game-stat-details">
                  <div className="detail-row">
                    <span className="label">{t('profile.bestScore')}:</span>
                    <span className="value">{stats.bestScore}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('profile.avgScore')}:</span>
                    <span className="value">{stats.averageScore}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('profile.avgAccuracy')}:</span>
                    <span className="value">{stats.averageAccuracy}%</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('profile.trend')}:</span>
                    <span className={`value trend-${stats.recentTrend}`}>
                      {t(`profile.trends.${stats.recentTrend}`)}
                    </span>
                  </div>
                </div>
              )}
              
              {isSelected && stats.totalGames === 0 && (
                <div className="game-stat-details empty">
                  <p>{t('profile.notPlayedYet')}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-btn" onClick={onBack}>
          ← {t('app.back')}
        </button>
        <h1>{t('profile.title')}</h1>
        {totalGames > 0 && (
          <button className="clear-btn" onClick={handleClearHistory}>
            🗑️
          </button>
        )}
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          {t('profile.tabs.overview')}
        </button>
        <button 
          className={`tab ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          {t('profile.tabs.daily')}
        </button>
        <button 
          className={`tab ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          {t('profile.tabs.games')}
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'daily' && renderDailyStats()}
        {activeTab === 'games' && renderGamesStats()}
      </div>
    </div>
  );
};

export default Profile;

