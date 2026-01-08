import React, { useEffect, useRef } from 'react';
import { GameLayout, ResultsModal, ProgressBar } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import { GAME_IDS, ROUNDS } from '../../../utils/constants';
import useHiddenNumber from './useHiddenNumber';
import './HiddenNumber.scss';

export interface HiddenNumberProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

export const HiddenNumber: React.FC<HiddenNumberProps> = ({ onBackToMenu, onNextGame }) => {
  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);
  const {
    status,
    currentRound,
    targetPosition,
    targetNumber,
    gridNumbers,
    times,
    currentScore,
    lastRoundTime,
    lastRoundPoints,
    startGame,
    handleCellClick,
    playAgain,
    getAverageTime,
    getBestTime,
    getWorstTime,
    gridSize,
    totalCells,
  } = useHiddenNumber();

  // Auto-add score when game ends (only once)
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      if (currentScore > 0) {
        addScore(GAME_IDS.HIDDEN_NUMBER, currentScore);
      }
      // For HiddenNumber, accuracy is 100% since we always find the number
      addGameResult({
        gameId: GAME_IDS.HIDDEN_NUMBER,
        score: currentScore,
        accuracy: 100,
        averageTime: getAverageTime() || 0,
      });
      scoreAddedRef.current = true;
    }
    // Reset flag when starting a new game
    if (status === 'intro' || status === 'playing' || status === 'feedback') {
      scoreAddedRef.current = false;
    }
  }, [status, currentScore, addScore, addGameResult, getAverageTime]);

  const renderContent = () => {
    if (status === 'intro') {
      return (
        <div className="hidden-number-intro">
          <div className="intro-card">
            <h2>🔢 Hidden Number</h2>
            <div className="intro-instructions">
              <p className="lead">Тренировка визуального поиска</p>
              <div className="rules">
                <h3>Правила:</h3>
                <ul>
                  <li>На экране появится сетка {gridSize.rows}×{gridSize.cols}</li>
                  <li>В одной из клеток будет <strong>число</strong></li>
                  <li><strong>Найдите</strong> и нажмите на него как можно быстрее</li>
                  <li>Чем быстрее найдёте — тем больше очков!</li>
                </ul>
              </div>
              <div className="scoring-info">
                <h4>Система очков:</h4>
                <ul>
                  <li>&lt; 3 секунд: <strong>3 очка</strong></li>
                  <li>3-5 секунд: <strong>2 очка</strong></li>
                  <li>&gt; 5 секунд: <strong>1 очко</strong></li>
                </ul>
              </div>
              <p className="text-muted">Всего раундов: {ROUNDS.HIDDEN_NUMBER}</p>
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
        <div className="hidden-number-game">
          <div className="progress-container">
            <ProgressBar 
              current={currentRound} 
              total={ROUNDS.HIDDEN_NUMBER}
              label={`Раунд ${currentRound + 1} / ${ROUNDS.HIDDEN_NUMBER}`}
            />
          </div>

          <div className="instruction-text">
            Найдите число <span className="target-number">{targetNumber}</span>
          </div>

          <div 
            className="number-grid"
            style={{
              gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
            }}
          >
            {gridNumbers.map((number, index) => (
              <button
                key={index}
                className={`grid-cell ${index === targetPosition ? 'has-target' : ''}`}
                onClick={() => handleCellClick(index)}
                aria-label={`Клетка с числом ${number}`}
              >
                {number}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (status === 'feedback') {
      return (
        <div className="hidden-number-feedback">
          <div className="feedback-content">
            <div className="feedback-icon">✓</div>
            <div className="feedback-time">
              {lastRoundTime ? `${(lastRoundTime / 1000).toFixed(2)}с` : ''}
            </div>
            <div className="feedback-points">
              +{lastRoundPoints} {lastRoundPoints === 1 ? 'очко' : lastRoundPoints! < 5 ? 'очка' : 'очков'}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderDetails = () => {
    const fastRounds = times.filter(t => t < 3000).length;
    const mediumRounds = times.filter(t => t >= 3000 && t < 5000).length;
    const slowRounds = times.filter(t => t >= 5000).length;

    return (
      <div className="results-details">
        <div className="results-summary">
          <p className="summary-text">
            Завершено раундов: {times.length} из {ROUNDS.HIDDEN_NUMBER}
          </p>
        </div>

        <div className="stat-item highlight">
          <span className="stat-label">⚡ Лучшее время:</span>
          <span className="stat-value stat-best">{(getBestTime() / 1000).toFixed(2)}с</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">📊 Среднее время:</span>
          <span className="stat-value">{(getAverageTime() / 1000).toFixed(2)}с</span>
        </div>

        {times.length > 1 && (
          <div className="stat-item">
            <span className="stat-label">🐌 Худшее время:</span>
            <span className="stat-value stat-worst">{(getWorstTime() / 1000).toFixed(2)}с</span>
          </div>
        )}

        <div className="speed-breakdown">
          <h4>Распределение по скорости:</h4>
          <div className="breakdown-item">
            <span>⚡ Быстро (&lt; 3с):</span>
            <span>{fastRounds} раундов</span>
          </div>
          <div className="breakdown-item">
            <span>🏃 Средне (3-5с):</span>
            <span>{mediumRounds} раундов</span>
          </div>
          <div className="breakdown-item">
            <span>🐌 Медленно (&gt; 5с):</span>
            <span>{slowRounds} раундов</span>
          </div>
        </div>
      </div>
    );
  };

  const getMessage = () => {
    const avgTime = getAverageTime();
    const bestTime = getBestTime();
    
    if (bestTime < 2000) {
      return '⚡ Невероятная скорость! Отличное внимание!';
    }
    if (avgTime < 3000) {
      return '🔥 Превосходно! Очень быстрая реакция!';
    }
    if (avgTime < 4000) {
      return '👍 Хорошая работа! Продолжайте тренироваться!';
    }
    if (avgTime < 5000) {
      return '💪 Неплохо! Есть куда расти!';
    }
    return '🎯 Тренируйте визуальный поиск!';
  };

  return (
    <GameLayout
      title="🔢 Hidden Number"
      footerContent={
        (status === 'playing' || status === 'feedback') && (
          <div className="game-stats">
            <span>Раунд: {currentRound}/{ROUNDS.HIDDEN_NUMBER}</span>
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

export default HiddenNumber;

