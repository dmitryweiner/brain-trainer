import React, { useEffect, useRef } from 'react';
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
            <h2>⚡ Reaction Click</h2>
            <div className="intro-instructions">
              <p className="lead">Тренировка скорости реакции</p>
              <ol className="instructions-list">
                <li>Дождитесь, когда экран станет <strong className="text-success">зелёным</strong></li>
                <li>Нажмите как можно быстрее</li>
                <li>Не нажимайте раньше времени!</li>
              </ol>
              <div className="scoring-info">
                <p><strong>Очки за скорость:</strong></p>
                <ul>
                  <li>&lt; 300ms: <strong>5 очков</strong></li>
                  <li>300-500ms: <strong>3 очка</strong></li>
                  <li>500-800ms: <strong>2 очка</strong></li>
                  <li>&gt; 800ms: <strong>1 очко</strong></li>
                </ul>
              </div>
              <p className="text-muted">Всего попыток: {ROUNDS.REACTION_CLICK}</p>
            </div>
            <button
              className="btn btn-primary btn-large"
              onClick={startGame}
            >
              Начать игру
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
            <h2>Ждите...</h2>
            <p className="attempt-counter">Попытка {currentAttempt + 1} из {ROUNDS.REACTION_CLICK}</p>
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
            <h2>НАЖМИТЕ СЕЙЧАС!</h2>
          </div>
        </div>
      );
    }

    if (status === 'tooEarly') {
      return (
        <div className="reaction-area reaction-too-early">
          <div className="reaction-content">
            <h2>Слишком рано!</h2>
            <p>Дождитесь зелёного экрана</p>
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

