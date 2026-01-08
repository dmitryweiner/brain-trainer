import React, { useEffect, useRef } from 'react';
import { GameLayout, ResultsModal, ProgressBar } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import { GAME_IDS, ROUNDS } from '../../../utils/constants';
import useOddOneOut from './useOddOneOut';
import './OddOneOut.scss';

export interface OddOneOutProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

export const OddOneOut: React.FC<OddOneOutProps> = ({ onBackToMenu, onNextGame }) => {
  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);
  const {
    status,
    currentRound,
    emojis,
    correctAnswers,
    results,
    currentScore,
    lastAnswerCorrect,
    currentDifficulty,
    gridSize,
    startGame,
    handleEmojiClick,
    playAgain,
    getAccuracy,
    getAverageTime,
  } = useOddOneOut();

  // Auto-add score when game ends (only once)
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      if (currentScore > 0) {
        addScore(GAME_IDS.ODD_ONE_OUT, currentScore);
      }
      addGameResult({
        gameId: GAME_IDS.ODD_ONE_OUT,
        score: currentScore,
        accuracy: getAccuracy(),
        averageTime: getAverageTime() || 0,
      });
      scoreAddedRef.current = true;
    }
    // Reset flag when starting a new game
    if (status === 'intro' || status === 'playing' || status === 'feedback') {
      scoreAddedRef.current = false;
    }
  }, [status, currentScore, addScore, addGameResult, getAccuracy, getAverageTime]);

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легко';
      case 'medium': return 'Средне';
      case 'hard': return 'Сложно';
      default: return '';
    }
  };

  const renderContent = () => {
    if (status === 'intro') {
      return (
        <div className="odd-one-out-intro">
          <div className="intro-card">
            <h2>🔍 Odd One Out</h2>
            <div className="intro-instructions">
              <p className="lead">Тренировка визуального анализа</p>
              <div className="rules">
                <h3>Правила:</h3>
                <ul>
                  <li>Смотрите на сетку символов</li>
                  <li>Найдите <strong>лишний</strong> символ</li>
                  <li>Нажмите на него</li>
                  <li>С каждым раундом сложность растёт!</li>
                </ul>
              </div>
              <div className="difficulty-info">
                <h4>Уровни сложности:</h4>
                <ul>
                  <li>🟢 Раунды 1-3: <strong>3×3</strong> (легко)</li>
                  <li>🟡 Раунды 4-7: <strong>4×4</strong> (средне)</li>
                  <li>🔴 Раунды 8-10: <strong>5×5</strong> (сложно)</li>
                </ul>
              </div>
              <div className="scoring-info">
                <p><strong>Очки:</strong> +1 за правильный ответ</p>
              </div>
              <p className="text-muted">Всего раундов: {ROUNDS.ODD_ONE_OUT}</p>
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

    if (status === 'playing') {
      return (
        <div className="odd-one-out-game">
          <div className="progress-container">
            <ProgressBar 
              current={currentRound} 
              total={ROUNDS.ODD_ONE_OUT}
              label={`Раунд ${currentRound + 1} / ${ROUNDS.ODD_ONE_OUT}`}
            />
          </div>

          <div className="difficulty-badge">
            <span className={`badge badge-${currentDifficulty}`}>
              {getDifficultyLabel(currentDifficulty)} ({gridSize}×{gridSize})
            </span>
          </div>

          <div className="instruction-text">
            Найдите лишний символ
          </div>

          <div 
            className={`emoji-grid grid-${gridSize}x${gridSize}`}
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            }}
          >
            {emojis.map((emoji, index) => (
              <button
                key={index}
                className="emoji-cell"
                onClick={() => handleEmojiClick(index)}
                aria-label={`Выбрать символ ${index + 1}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (status === 'feedback') {
      return (
        <div className="odd-one-out-feedback">
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
    const easyCorrect = results.filter(r => r.correct && r.difficulty === 'easy').length;
    const mediumCorrect = results.filter(r => r.correct && r.difficulty === 'medium').length;
    const hardCorrect = results.filter(r => r.correct && r.difficulty === 'hard').length;

    return (
      <div className="results-details">
        <div className="results-summary">
          <p className="summary-text">
            Правильных ответов: {correctAnswers} из {ROUNDS.ODD_ONE_OUT}
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

        <div className="difficulty-breakdown">
          <h4>По уровням сложности:</h4>
          <div className="breakdown-item">
            <span>🟢 3×3 (1-3):</span>
            <span>{easyCorrect} / {results.filter(r => r.difficulty === 'easy').length}</span>
          </div>
          <div className="breakdown-item">
            <span>🟡 4×4 (4-7):</span>
            <span>{mediumCorrect} / {results.filter(r => r.difficulty === 'medium').length}</span>
          </div>
          <div className="breakdown-item">
            <span>🔴 5×5 (8-10):</span>
            <span>{hardCorrect} / {results.filter(r => r.difficulty === 'hard').length}</span>
          </div>
        </div>
      </div>
    );
  };

  const getMessage = () => {
    const accuracy = getAccuracy();
    
    if (accuracy === 100) {
      return '🏆 Безупречно! Вы мастер визуального анализа!';
    }
    if (accuracy >= 90) {
      return '⭐ Отлично! У вас очень зоркий глаз!';
    }
    if (accuracy >= 70) {
      return '👍 Хорошо! Продолжайте тренироваться!';
    }
    if (accuracy >= 50) {
      return '💪 Неплохо! Будьте внимательнее!';
    }
    return '🎯 Тренируйте внимание к деталям!';
  };

  return (
    <GameLayout
      title="🔍 Odd One Out"
      footerContent={
        (status === 'playing' || status === 'feedback') && (
          <div className="game-stats">
            <span>Правильно: {correctAnswers}/{currentRound}</span>
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

export default OddOneOut;

