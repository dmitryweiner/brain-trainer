import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GAMES } from '../core/games/registry';
import type { GameSession } from '../core/types';
import { achievements } from '../core/stats/engagement';
import './Engagement.scss';

export const AchievementsPanel: React.FC<{ sessions: readonly GameSession[] }> = ({ sessions }) => {
  const { t, i18n } = useTranslation();
  const list = useMemo(() => achievements(sessions, GAMES), [sessions]);
  const unlocked = list.filter(a => a.at !== undefined).length;
  return (
    <div className="achievements">
      <p className="achievements-summary">{t('achievements.summary', { unlocked, total: list.length })}</p>
      <ul className="achievement-grid">
        {list.map(a => {
          const done = a.at !== undefined;
          return (
            <li key={a.id} className={`achievement ${done ? 'done' : 'locked'}`}>
              <span className="achievement-icon" aria-hidden="true">{a.icon}</span>
              <div>
                <strong>{t(`achievements.${a.id}.title`)}</strong>
                <p>{t(`achievements.${a.id}.description`)}</p>
                {done ? (
                  <p className="achievement-date">{new Date(a.at!).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                ) : a.progress && (
                  <div className="achievement-progress" role="progressbar" aria-valuenow={Math.min(a.progress[0], a.progress[1])} aria-valuemin={0} aria-valuemax={a.progress[1]}>
                    <span style={{ width: `${Math.min(100, (a.progress[0] / a.progress[1]) * 100)}%` }} />
                    <em>{Math.min(a.progress[0], a.progress[1])} / {a.progress[1]}</em>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AchievementsPanel;
