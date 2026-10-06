import React from 'react';
import { useTranslation } from 'react-i18next';
import { GAMES, getGame } from '../core/games/registry';
import type { GameId, GameSession } from '../core/types';
import { dayKey } from '../core/stats';
import { workoutProgress, workoutStreak } from '../core/stats/engagement';
import './Engagement.scss';

export interface WorkoutBlockProps {
  sessions: readonly GameSession[];
  now: number;
  onPlay: (gameId: GameId) => void;
}

/** Today's workout: four games, one per slot (PLAN-IMPROVEMENTS.md, 3.1) */
export const WorkoutBlock: React.FC<WorkoutBlockProps> = ({ sessions, now, onPlay }) => {
  const { t } = useTranslation();
  const progress = workoutProgress(sessions, dayKey(now), GAMES);
  const streak = workoutStreak(sessions, GAMES, now);
  const next = progress.games.find(g => !g.done);
  return (
    <section className="workout" aria-labelledby="workout-title">
      <div className="workout-head">
        <h2 id="workout-title">🏋️ {t('workout.title')}</h2>
        <span className="workout-streak" title={t('workout.streakHint')}>🔥 {t('workout.streak', { count: streak })}</span>
      </div>
      <ul className="workout-games">
        {progress.games.map(g => (
          <li key={g.id} className={g.done ? 'done' : ''}>
            <span aria-hidden="true">{getGame(g.id).icon}</span>
            <span>{t(`games.${g.id}.title`)}</span>
            {g.done && <span className="check" aria-label={t('workout.done')}>✓</span>}
          </li>
        ))}
      </ul>
      {next ? (
        <button className="btn-custom btn-primary btn-large btn-full" onClick={() => onPlay(next.id)}>
          {progress.done === 0 ? t('workout.start') : t('workout.continue', { done: progress.done, total: progress.games.length })}
        </button>
      ) : (
        <p className="workout-done">🎉 {t('workout.complete')}</p>
      )}
    </section>
  );
};

export default WorkoutBlock;
