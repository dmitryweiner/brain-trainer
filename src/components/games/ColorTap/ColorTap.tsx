import React, { useEffect, useRef } from 'react';
import { GameLayout, ResultsModal, Button } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
import { GAME_IDS, ROUNDS } from '../../../utils/constants';
import useColorTap from './useColorTap';
import './ColorTap.scss';

export interface ColorTapProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

export const ColorTap: React.FC<ColorTapProps> = ({ onBackToMenu, onNextGame }) => {
  const { addScore } = useScoreContext();
  const scoreAddedRef = useRef(false);
  const {
    status,
    currentRound,
    currentColor,
    correctAnswers,
    results,
    currentScore,
    lastAnswerCorrect,
    startGame,
    handleAnswer,
    playAgain,
    getAccuracy,
    getAverageTime,
    getFastAnswers,
  } = useColorTap();

  // Auto-add score when game ends (only once)
  useEffect(() => {
    if (status === 'results' && currentScore > 0 && !scoreAddedRef.current) {
      addScore(GAME_IDS.COLOR_TAP, currentScore);
      scoreAddedRef.current = true;
    }
    // Reset flag when starting a new game
    if (status === 'intro' || status === 'playing' || status === 'feedback') {
      scoreAddedRef.current = false;
    }
  }, [status, currentScore, addScore]);

  const renderContent = () => {
    if (status === 'intro') {
      return (
        <div className="color-tap-intro">
          <div className="intro-card">
            <h2>🎨 Color Tap</h2>
            <div className="intro-instructions">
              <p className="lead">Тренировка реакции и внимания</p>
              <div className="rules">
                <h3>Правила:</h3>
                <ul>
                  <li>🟢 Зелёный круг → нажмите <strong>ДА</strong></li>
                  <li>🔴 Красный круг → нажмите <strong>НЕТ</strong></li>
                  <li>⚡ Быстрый ответ (&lt; 1сек) = бонус!</li>
                </ul>
              </div>
              <div className="scoring-info">
                <p><strong>Очки:</strong></p>
                <ul>
                  <li>Правильный ответ: <strong>+1 очко</strong></li>
                  <li>Быстрый ответ: <strong>+0.5 бонус</strong></li>
                </ul>
              </div>
              <p className="text-muted">Всего раундов: {ROUNDS.COLOR_TAP}</p>
            </div>
            <Button
              variant="primary"
              size="large"
              onClick={startGame}
              fullWidth
            >
              Начать игру
            </Button>
          </div>
        </div>
      );
    }

    if (status === 'playing') {
      return (
        <div className="color-tap-game">
          <div className="round-indicator">
            Раунд {currentRound + 1} / {ROUNDS.COLOR_TAP}
          </div>

          <div className={`color-circle ${currentColor}`}>
            <div className="circle-inner"></div>
          </div>

          <div className="answer-buttons">
            <Button
              variant="success"
              size="large"
              onClick={() => handleAnswer(true)}
              fullWidth
              className="answer-btn yes-btn"
            >
              ✓ ДА
            </Button>
            <Button
              variant="danger"
              size="large"
              onClick={() => handleAnswer(false)}
              fullWidth
              className="answer-btn no-btn"
            >
              ✗ НЕТ
            </Button>
          </div>
        </div>
      );
    }

    if (status === 'feedback') {
      return (
        <div className="color-tap-feedback">
          <div className={`feedback-indicator ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
            {lastAnswerCorrect ? (
              <>
                <div className="feedback-icon">✓</div>
                <div className="feedback-text">Правильно!</div>
              </>
            ) : (
              <>
                <div className="feedback-icon">✗</div>
                <div className="feedback-text">Неправильно</div>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderDetails = () => {
    return (
      <div className="results-details">
        <div className="results-summary">
          <p className="summary-text">
            Правильных ответов: {correctAnswers} из {ROUNDS.COLOR_TAP}
          </p>
        </div>

        <div className="stat-item highlight">
          <span className="stat-label">🎯 Точность:</span>
          <span className="stat-value stat-best">{getAccuracy()}%</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">⏱️ Среднее время:</span>
          <span className="stat-value">{getAverageTime()}ms</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">⚡ Быстрых ответов:</span>
          <span className="stat-value">{getFastAnswers()}</span>
        </div>
      </div>
    );
  };

  const getMessage = () => {
    const accuracy = getAccuracy();
    const fastAnswers = getFastAnswers();
    
    if (accuracy === 100 && fastAnswers >= 15) {
      return '🏆 Безупречно! Вы мастер реакции!';
    }
    if (accuracy >= 90) {
      return '⚡ Отлично! Очень точная работа!';
    }
    if (accuracy >= 75) {
      return '👍 Хорошо! Продолжайте тренироваться!';
    }
    if (accuracy >= 60) {
      return '💪 Неплохо! Есть куда расти!';
    }
    return '🎯 Продолжайте практиковаться!';
  };

  return (
    <GameLayout
      title="🎨 Color Tap"
      footerContent={
        (status === 'playing' || status === 'feedback') && (
          <div className="game-stats">
            <span>Правильно: {correctAnswers}/{currentRound}</span>
            <span>Очки: {currentScore.toFixed(1)}</span>
          </div>
        )
      }
    >
      {renderContent()}

      <ResultsModal
        show={status === 'results'}
        title="🎮 Игра завершена!"
        score={Math.round(currentScore * 10) / 10}
        message={getMessage()}
        details={renderDetails()}
        onPlayAgain={playAgain}
        onBackToMenu={onBackToMenu}
        onNextGame={onNextGame}
      />
    </GameLayout>
  );
};

export default ColorTap;

