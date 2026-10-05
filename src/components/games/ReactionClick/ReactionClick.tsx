import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../../../ui/GameShell';
import { getGame } from '../../../core/games/registry';
import {
  REACTION_CLICK, type ReactionClickEvent, type ReactionClickState,
} from '../../../core/games/reactionClick/engine';
import './ReactionClick.scss';

export interface ReactionClickProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

const TOTAL = REACTION_CLICK.attempts;

const Intro: GameViews<ReactionClickState, ReactionClickEvent>['Intro'] = ({ onStart }) => {
  const { t } = useTranslation();
  return (
    <div className="reaction-intro">
      <div className="intro-card">
        <h2>⚡ {t('games.reaction-click.title')}</h2>
        <div className="intro-instructions">
          <p className="lead">{t('games.reaction-click.instructions.lead')}</p>
          <ol className="instructions-list">
            <li>{t('games.reaction-click.instructions.wait')}</li>
            <li>{t('games.reaction-click.instructions.clickFast')}</li>
            <li>{t('games.reaction-click.instructions.dontClickEarly')}</li>
          </ol>
          <div className="scoring-info">
            <p><strong>{t('games.reaction-click.instructions.scoring')}:</strong></p>
            <ul>
              <li><strong>{t('games.reaction-click.instructions.score5')}</strong></li>
              <li><strong>{t('games.reaction-click.instructions.score3')}</strong></li>
              <li><strong>{t('games.reaction-click.instructions.score2')}</strong></li>
              <li><strong>{t('games.reaction-click.instructions.score1')}</strong></li>
            </ul>
          </div>
          <p className="text-muted">{t('games.reaction-click.instructions.totalAttempts')}: {TOTAL}</p>
        </div>
        <button className="btn btn-primary btn-large" onClick={onStart}>
          {t('common.startGame')}
        </button>
      </div>
    </div>
  );
};

const Board: GameViews<ReactionClickState, ReactionClickEvent>['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const tap = () => dispatch({ type: 'tap' });
  const tappable = {
    onClick: tap,
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && tap(),
  };

  switch (state.phase) {
    case 'waiting':
      return (
        <div className="reaction-area reaction-waiting" {...tappable}>
          <div className="reaction-content">
            <div className="reaction-emoji">💣</div>
            <h2>{t('games.reaction-click.waiting')}</h2>
            <p className="attempt-counter">{t('games.reaction-click.attempt')} {state.attempt + 1} / {TOTAL}</p>
          </div>
        </div>
      );
    case 'ready':
      return (
        <div className="reaction-area reaction-ready" {...tappable}>
          <div className="reaction-content">
            <div className="reaction-emoji">🔘</div>
            <h2>{t('games.reaction-click.clickNow')}</h2>
          </div>
        </div>
      );
    case 'clicked':
      return (
        <div className="reaction-area reaction-clicked">
          <div className="reaction-content">
            <div className="reaction-emoji celebration">🎉</div>
            <h2>{t('games.reaction-click.great')}</h2>
          </div>
        </div>
      );
    case 'tooEarly':
      return (
        <div className="reaction-area reaction-too-early">
          <div className="reaction-content">
            <div className="reaction-emoji explosion">💥</div>
            <h2>{t('games.reaction-click.tooEarly')}</h2>
            <p>{t('games.reaction-click.waitForButton')}</p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const Footer: GameViews<ReactionClickState, ReactionClickEvent>['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <div className="game-stats">
      <span>{t('games.reaction-click.attempt')}: {Math.min(state.attempt + 1, TOTAL)}/{TOTAL}</span>
      <span>{t('common.score')}: {state.score}</span>
    </div>
  );
};

const Details: GameViews<ReactionClickState, ReactionClickEvent>['Details'] = ({ state, outcome }) => {
  const { t } = useTranslation();
  const times = state.reactionTimes;
  if (times.length === 0) {
    return (
      <div className="results-details">
        <p className="text-muted">{t('games.reaction-click.noSuccessfulAttempts')}</p>
      </div>
    );
  }
  const best = outcome.metrics.bestReactionMs;
  const worst = outcome.metrics.worstReactionMs;
  return (
    <div className="results-details">
      <div className="results-summary">
        <p className="summary-text">
          {t('games.reaction-click.completedAttempts', { completed: times.length, total: TOTAL })}
          {state.falseStarts > 0 && ` (${t('games.reaction-click.tooEarlyCount', { count: state.falseStarts })})`}
        </p>
      </div>

      <div className="stat-item highlight">
        <span className="stat-label">⚡ {t('games.reaction-click.bestReaction')}:</span>
        <span className="stat-value stat-best">{best}{t('common.ms')}</span>
      </div>

      <div className="stat-item">
        <span className="stat-label">📊 {t('games.reaction-click.averageReaction')}:</span>
        <span className="stat-value">{outcome.avgTimeMs}{t('common.ms')}</span>
      </div>

      {times.length > 1 && (
        <div className="stat-item">
          <span className="stat-label">🐌 {t('games.reaction-click.worstReaction')}:</span>
          <span className="stat-value stat-worst">{worst}{t('common.ms')}</span>
        </div>
      )}

      <div className="all-times">
        <div className="stat-label">{t('games.reaction-click.allResults')}:</div>
        <div className="times-list">
          {times.map((time, index) => (
            <span
              key={index}
              className={`time-chip ${time === best ? 'best' : time === worst && times.length > 1 ? 'worst' : ''}`}
            >
              {index + 1}. {time}{t('common.ms')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const views: GameViews<ReactionClickState, ReactionClickEvent> = {
  Intro,
  Board,
  Footer,
  Details,
  message: (outcome, t) => {
    if (outcome.metrics.hits === 0) return t('games.reaction-click.results.tryAgain');
    if (outcome.metrics.bestReactionMs < 250) return t('games.reaction-click.results.incredible');
    if (outcome.avgTimeMs < 300) return t('games.reaction-click.results.excellent');
    if (outcome.avgTimeMs < 500) return t('games.reaction-click.results.good');
    if (outcome.avgTimeMs < 700) return t('games.reaction-click.results.notBad');
    return t('games.reaction-click.results.keepPracticing');
  },
};

export const ReactionClick: React.FC<ReactionClickProps> = ({ onBackToMenu, onNextGame }) => {
  const { t } = useTranslation();
  return (
    <GameShell
      game={getGame('reaction-click')}
      views={views}
      title={`⚡ ${t('games.reaction-click.title')}`}
      onBack={onBackToMenu}
      onNextGame={onNextGame}
    />
  );
};

export default ReactionClick;
