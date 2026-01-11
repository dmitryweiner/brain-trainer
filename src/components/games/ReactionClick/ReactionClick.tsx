import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout, ResultsModal } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import { GAME_IDS, ROUNDS } from '../../../utils/constants';
import useReactionClick from './useReactionClick';
import './ReactionClick.scss';

export interface ReactionClickProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

export const ReactionClick: React.FC<ReactionClickProps> = ({ onBackToMenu, onNextGame }) => {
  const { t } = useTranslation();
  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);
  const {
    status,
    currentAttempt,
    reactionTimes,
    currentScore,
    tooEarlyCount,
    startGame,
    handleClick,
    playAgain,
    getAverageTime,
    getBestTime,
    getWorstTime,
  } = useReactionClick();

  // Auto-add score when game ends (only once)
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      if (currentScore > 0) {
        addScore(GAME_IDS.REACTION_CLICK, currentScore);
      }
      // Record game history
      const successRate = reactionTimes.length > 0 
        ? (reactionTimes.length / ROUNDS.REACTION_CLICK) * 100 
        : 0;
      addGameResult({
        gameId: GAME_IDS.REACTION_CLICK,
        score: currentScore,
        accuracy: Math.round(successRate),
        averageTime: getAverageTime() || 0,
      });
      scoreAddedRef.current = true;
    }
    // Reset flag when starting a new game
    if (status === 'intro' || status === 'waiting') {
      scoreAddedRef.current = false;
    }
  }, [status, currentScore, addScore, addGameResult, reactionTimes, getAverageTime]);

  const renderContent = () => {
    if (status === 'intro') {
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
              <p className="text-muted">{t('games.reaction-click.instructions.totalAttempts')}: {ROUNDS.REACTION_CLICK}</p>
            </div>
            <button
              className="btn btn-primary btn-large"
              onClick={startGame}
            >
              {t('common.startGame')}
            </button>
          </div>
        </div>
      );
    }

    if (status === 'waiting') {
      return (
        <div
          className="reaction-area reaction-waiting"
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          <div className="reaction-content">
            <div className="reaction-emoji">💣</div>
            <h2>{t('games.reaction-click.waiting')}</h2>
            <p className="attempt-counter">{t('games.reaction-click.attempt')} {currentAttempt + 1} / {ROUNDS.REACTION_CLICK}</p>
          </div>
        </div>
      );
    }

    if (status === 'ready') {
      return (
        <div
          className="reaction-area reaction-ready"
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          <div className="reaction-content">
            <div className="reaction-emoji">🔘</div>
            <h2>{t('games.reaction-click.clickNow')}</h2>
          </div>
        </div>
      );
    }

    if (status === 'clicked') {
      return (
        <div className="reaction-area reaction-clicked">
          <div className="reaction-content">
            <div className="reaction-emoji celebration">🎉</div>
            <h2>{t('games.reaction-click.great')}</h2>
          </div>
        </div>
      );
    }

    if (status === 'tooEarly') {
      return (
        <div className="reaction-area reaction-too-early">
          <div className="reaction-content">
            <div className="reaction-emoji explosion">💥</div>
            <h2>{t('games.reaction-click.tooEarly')}</h2>
            <p>{t('games.reaction-click.waitForButton')}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderDetails = () => {
    if (reactionTimes.length === 0) {
      return (
        <div className="results-details">
          <p className="text-muted">{t('games.reaction-click.noSuccessfulAttempts')}</p>
        </div>
      );
    }

    return (
      <div className="results-details">
        <div className="results-summary">
          <p className="summary-text">
            {t('games.reaction-click.completedAttempts', { completed: reactionTimes.length, total: ROUNDS.REACTION_CLICK })}
            {tooEarlyCount > 0 && ` (${t('games.reaction-click.tooEarlyCount', { count: tooEarlyCount })})`}
          </p>
        </div>

        <div className="stat-item highlight">
          <span className="stat-label">⚡ {t('games.reaction-click.bestReaction')}:</span>
          <span className="stat-value stat-best">{getBestTime()}{t('common.ms')}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">📊 {t('games.reaction-click.averageReaction')}:</span>
          <span className="stat-value">{getAverageTime()}{t('common.ms')}</span>
        </div>

        {reactionTimes.length > 1 && (
          <div className="stat-item">
            <span className="stat-label">🐌 {t('games.reaction-click.worstReaction')}:</span>
            <span className="stat-value stat-worst">{getWorstTime()}{t('common.ms')}</span>
          </div>
        )}

        {reactionTimes.length > 0 && (
          <div className="all-times">
            <div className="stat-label">{t('games.reaction-click.allResults')}:</div>
            <div className="times-list">
              {reactionTimes.map((time, index) => (
                <span 
                  key={index} 
                  className={`time-chip ${time === getBestTime() ? 'best' : time === getWorstTime() && reactionTimes.length > 1 ? 'worst' : ''}`}
                >
                  {index + 1}. {time}{t('common.ms')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getMessage = () => {
    if (reactionTimes.length === 0) {
      return t('games.reaction-click.results.tryAgain');
    }
    
    const avgTime = getAverageTime();
    const bestTime = getBestTime();
    
    if (bestTime < 250) return t('games.reaction-click.results.incredible');
    if (avgTime < 300) return t('games.reaction-click.results.excellent');
    if (avgTime < 500) return t('games.reaction-click.results.good');
    if (avgTime < 700) return t('games.reaction-click.results.notBad');
    return t('games.reaction-click.results.keepPracticing');
  };

  return (
    <GameLayout
      title={`⚡ ${t('games.reaction-click.title')}`}
      footerContent={
        status !== 'intro' && status !== 'results' && (
          <div className="game-stats">
            <span>{t('games.reaction-click.attempt')}: {currentAttempt + 1}/{ROUNDS.REACTION_CLICK}</span>
            <span>{t('common.score')}: {currentScore}</span>
          </div>
        )
      }
    >
      {renderContent()}

      <ResultsModal
        show={status === 'results'}
        title={`🎮 ${t('common.gameOver')}`}
        score={currentScore}
        message={getMessage()}
        details={renderDetails()}
        onPlayAgain={playAgain}
        onBackToMenu={onBackToMenu}
        onNextGame={onNextGame}
      />
    </GameLayout>
  );
};

export default ReactionClick;

