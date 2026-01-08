import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout, ResultsModal } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
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
    if (status === 'results' && currentScore > 0 && !scoreAddedRef.current) {
      addScore(GAME_IDS.REACTION_CLICK, currentScore);
      scoreAddedRef.current = true;
    }
    // Reset flag when starting a new game
    if (status === 'intro' || status === 'waiting') {
      scoreAddedRef.current = false;
    }
  }, [status, currentScore, addScore]);

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
          <p className="text-muted">Нет успешных попыток</p>
        </div>
      );
    }

    return (
      <div className="results-details">
        <div className="results-summary">
          <p className="summary-text">
            Вы завершили {reactionTimes.length} из {ROUNDS.REACTION_CLICK} попыток
            {tooEarlyCount > 0 && ` (${tooEarlyCount} слишком рано)`}
          </p>
        </div>

        <div className="stat-item highlight">
          <span className="stat-label">⚡ Лучшая реакция:</span>
          <span className="stat-value stat-best">{getBestTime()}ms</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">📊 Средняя реакция:</span>
          <span className="stat-value">{getAverageTime()}ms</span>
        </div>

        {reactionTimes.length > 1 && (
          <div className="stat-item">
            <span className="stat-label">🐌 Худшая реакция:</span>
            <span className="stat-value stat-worst">{getWorstTime()}ms</span>
          </div>
        )}

        {reactionTimes.length > 0 && (
          <div className="all-times">
            <div className="stat-label">Все результаты:</div>
            <div className="times-list">
              {reactionTimes.map((time, index) => (
                <span 
                  key={index} 
                  className={`time-chip ${time === getBestTime() ? 'best' : time === getWorstTime() && reactionTimes.length > 1 ? 'worst' : ''}`}
                >
                  {index + 1}. {time}ms
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
      return '😅 Попробуйте ещё раз!';
    }
    
    const avgTime = getAverageTime();
    const bestTime = getBestTime();
    
    if (bestTime < 250) return '⚡ Невероятная реакция! Вы молниеносны!';
    if (avgTime < 300) return '🔥 Отличная скорость! Превосходный результат!';
    if (avgTime < 500) return '👍 Хорошая работа! Продолжайте в том же духе!';
    if (avgTime < 700) return '💪 Неплохо! Есть куда расти!';
    return '🎯 Продолжайте тренироваться, скорость придёт!';
  };

  return (
    <GameLayout
      title="⚡ Reaction Click"
      footerContent={
        status !== 'intro' && status !== 'results' && (
          <div className="game-stats">
            <span>Попытка: {currentAttempt + 1}/{ROUNDS.REACTION_CLICK}</span>
            <span>Очки: {currentScore}</span>
          </div>
        )
      }
    >
      {renderContent()}

      <ResultsModal
        show={status === 'results'}
        title="🎮 Игра завершена!"
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

