import React, { useEffect, useRef } from 'react';
import { GameLayout, ResultsModal, ProgressBar } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import { GAME_IDS, ROUNDS } from '../../../utils/constants';
import useSymbolMatch from './useSymbolMatch';
import './SymbolMatch.scss';

export interface SymbolMatchProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

export const SymbolMatch: React.FC<SymbolMatchProps> = ({ onBackToMenu, onNextGame }) => {
  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);
  const {
    status,
    currentRound,
    emoji1,
    emoji2,
    correctAnswers,
    results,
    currentScore,
    lastAnswerCorrect,
    startGame,
    handleAnswer,
    playAgain,
    getAccuracy,
    getAverageTime,
  } = useSymbolMatch();

  // Auto-add score when game ends (only once)
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      if (currentScore > 0) {
        addScore(GAME_IDS.SYMBOL_MATCH, currentScore);
      }
      addGameResult({
        gameId: GAME_IDS.SYMBOL_MATCH,
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

  const renderContent = () => {
    if (status === 'intro') {
      return (
        <div className="symbol-match-intro">
          <div className="intro-card">
            <h2>🔄 Symbol Match</h2>
            <div className="intro-instructions">
              <p className="lead">Тренировка зрительного внимания</p>
              <div className="rules">
                <h3>Правила:</h3>
                <ul>
                  <li>Смотрите на два символа</li>
                  <li>Определите, <strong>совпадают</strong> они или нет</li>
                  <li>Нажмите соответствующую кнопку</li>
                  <li>Будьте внимательны!</li>
                </ul>
              </div>
              <div className="scoring-info">
                <p><strong>Очки:</strong></p>
                <p>Правильный ответ: <strong>+1 очко</strong></p>
              </div>
              <p className="text-muted">Всего раундов: {ROUNDS.SYMBOL_MATCH}</p>
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
        <div className="symbol-match-game">
          <div className="progress-container">
            <ProgressBar 
              current={currentRound} 
              total={ROUNDS.SYMBOL_MATCH}
              label={`Раунд ${currentRound + 1} / ${ROUNDS.SYMBOL_MATCH}`}
            />
          </div>

          <div className="emojis-container">
            <div className="emoji emoji-1">{emoji1}</div>
            <div className="emoji-divider">vs</div>
            <div className="emoji emoji-2">{emoji2}</div>
          </div>

          <div className="answer-buttons">
            <button
              className="btn btn-success btn-large answer-btn match-btn"
              onClick={() => handleAnswer(true)}
            >
              ✓ Совпадают
            </button>
            <button
              className="btn btn-danger btn-large answer-btn no-match-btn"
              onClick={() => handleAnswer(false)}
            >
              ✗ Не совпадают
            </button>
          </div>
        </div>
      );
    }

    if (status === 'feedback') {
      return (
        <div className="symbol-match-feedback">
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
            Правильных ответов: {correctAnswers} из {ROUNDS.SYMBOL_MATCH}
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
      </div>
    );
  };

  const getMessage = () => {
    const accuracy = getAccuracy();
    
    if (accuracy === 100) {
      return '🏆 Идеально! У вас отличное внимание!';
    }
    if (accuracy >= 90) {
      return '⭐ Отлично! Очень внимательны!';
    }
    if (accuracy >= 75) {
      return '👍 Хорошо! Продолжайте тренироваться!';
    }
    if (accuracy >= 60) {
      return '💪 Неплохо! Будьте внимательнее!';
    }
    return '🎯 Тренируйте внимание!';
  };

  return (
    <GameLayout
      title="🔄 Symbol Match"
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

export default SymbolMatch;

