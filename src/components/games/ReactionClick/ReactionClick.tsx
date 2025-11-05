import React, { useEffect } from 'react';
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
  } = useReactionClick();

  // Auto-add score when game ends
  useEffect(() => {
    if (status === 'results' && currentScore > 0) {
      addScore(GAME_IDS.REACTION_CLICK, currentScore);
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
    if (reactionTimes.length === 0) return null;

    return (
      <div className="results-details">
        <div className="stat-item">
          <span className="stat-label">Средняя реакция:</span>
          <span className="stat-value">{getAverageTime()}ms</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Лучшая реакция:</span>
          <span className="stat-value">{getBestTime()}ms</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Успешных попыток:</span>
          <span className="stat-value">{reactionTimes.length}/{ROUNDS.REACTION_CLICK}</span>
        </div>
        {tooEarlyCount > 0 && (
          <div className="stat-item">
            <span className="stat-label">Слишком рано:</span>
            <span className="stat-value text-warning">{tooEarlyCount}</span>
          </div>
        )}
      </div>
    );
  };

  const getMessage = () => {
    const avgTime = getAverageTime();
    if (avgTime < 300) return '⚡ Невероятная реакция!';
    if (avgTime < 500) return '🔥 Отличная скорость!';
    if (avgTime < 700) return '👍 Хорошая работа!';
    return '💪 Продолжайте тренироваться!';
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
        title="Игра завершена!"
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

