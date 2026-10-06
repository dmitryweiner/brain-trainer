import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import type { GameSession } from '../../core/types';
import { GAMES, getGame } from '../../core/games/registry';
import { achievements, type Achievement } from '../../core/stats/engagement';
import { Confetti } from '../../ui/Confetti';
import { activeSessions, reviewSession, type SessionReview } from '../../core/stats';
import { useOptionalServices } from '../../ui/services';
import { RatingBars, RatingRing } from '../../ui/charts/charts';
import './ResultsModal.scss';

export interface ResultsModalProps {
  show: boolean;
  title: string;
  score: number;
  message: string;
  details?: React.ReactNode;
  /** The session just recorded: adds rating, comparison and level change */
  session?: GameSession | null;
  onPlayAgain: () => void;
  onNextGame?: () => void;
  onBackToMenu: () => void;
}

const noEvents = () => () => undefined;

interface Review extends SessionReview {
  /** Achievements this very session unlocked */
  unlocked: Achievement[];
}

/** Rating, record, level and new achievements of the session, recomputed from the event log. */
function useReview(session: GameSession | null | undefined): Review | null {
  const services = useOptionalServices();
  const repo = services?.repository;
  const events = useSyncExternalStore(repo ? l => repo.subscribe(l) : noEvents, () => repo?.events ?? null);
  return useMemo(() => {
    if (!session || !events) return null;
    const sessions = activeSessions(events);
    const review = reviewSession(sessions, session.id, getGame(session.gameId));
    if (!review) return null;
    return { ...review, unlocked: achievements(sessions, GAMES).filter(a => a.sessionId === session.id) };
  }, [session, events]);
}

const SessionSummary: React.FC<{ review: Review }> = ({ review }) => {
  const { t } = useTranslation();
  const feedback = useOptionalServices()?.feedback;
  // the record fanfare plays once per session, not on every re-render
  const celebrated = useRef<string | null>(null);
  useEffect(() => {
    if (review.isRecord && celebrated.current !== review.session.id) {
      celebrated.current = review.session.id;
      feedback?.play('record');
    }
  }, [review.isRecord, review.session.id, feedback]);
  const { session } = review;
  const game = getGame(session.gameId);
  const leveled = game.maxLevel > game.minLevel;

  let comparison: string;
  if (review.isRecord) comparison = `🏆 ${t('results.newRecord')}`;
  else if (review.previous === null) comparison = t('results.firstTime');
  else if (review.deltaPct === null || review.deltaPct === 0) comparison = t('results.sameAsLast');
  else comparison = t('results.vsLast', { delta: `${review.deltaPct > 0 ? '+' : '−'}${Math.abs(review.deltaPct)}` });

  let levelText: string | null = null;
  if (leveled) {
    const { levelBefore: from, levelAfter: to } = review;
    levelText = to > from ? `⬆️ ${t('results.levelUp', { from, to })}`
      : to < from ? t('results.levelDown', { from, to })
        : t('results.levelSame', { level: from });
  }

  return (
    <div className="session-summary">
      {review.isRecord && <Confetti />}
      <RatingRing
        value={session.rating}
        label={t('results.rating')}
        caption={leveled ? t('results.level', { level: session.level }) : undefined}
      />
      <p className={`summary-comparison${review.isRecord ? ' record' : ''}`}>{comparison}</p>
      {review.previousBest !== null && !review.isRecord && (
        <p className="summary-record">{t('results.record', { value: review.previousBest })}</p>
      )}
      {levelText && <p className="summary-level">{levelText}</p>}
      {review.recent.length > 1 && (
        <RatingBars
          values={review.recent}
          label={t('results.recent')}
          describe={(value, i) =>
            i === review.recent.length - 1 ? t('results.barCurrent', { value }) : t('results.barPast', { n: i + 1, value })
          }
        />
      )}
      {review.unlocked.length > 0 && (
        <ul className="new-achievements">
          {review.unlocked.map(a => (
            <li key={a.id}>
              <span aria-hidden="true">{a.icon}</span> {t('achievements.new')}: <strong>{t(`achievements.${a.id}.title`)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const ResultsModal: React.FC<ResultsModalProps> = ({
  show,
  title,
  score,
  message,
  details,
  session,
  onPlayAgain,
  onNextGame,
  onBackToMenu,
}) => {
  const { t } = useTranslation();
  const review = useReview(show ? session : null);

  if (!show) return null;

  return (
    <div className="modal-overlay results-overlay">
      <div className="results-modal" role="dialog" aria-modal="true" aria-labelledby="results-title">
        <button className="modal-close" onClick={onBackToMenu} aria-label={t('app.back')}>
          ×
        </button>

        <h2 id="results-title" className="results-title">{title}</h2>

        {review && <SessionSummary review={review} />}

        <div className="score-container">
          <div className="results-score-label">{t('common.score')}:</div>
          <div className="results-score-value">🏆 {score} {t('common.points')}</div>
        </div>

        <p className="message">{message}</p>

        {details && <div className="details-container">{details}</div>}

        <div className="modal-actions">
          {onNextGame && (
            <Button variant="primary" fullWidth onClick={onNextGame} className="mb-2">
              {t('common.nextGame')}
            </Button>
          )}
          <Button variant="secondary" fullWidth onClick={onPlayAgain} className="mb-2">
            {t('common.playAgain')}
          </Button>
          <Button variant="light" fullWidth onClick={onBackToMenu}>
            {t('common.backToMenu')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsModal;
