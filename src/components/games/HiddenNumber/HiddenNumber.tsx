import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            <h2>🔢 {t('games.hidden-number.title')}</h2>
            <div className="intro-instructions">
              <p className="lead">{t('games.hidden-number.instructions.lead')}</p>
              <div className="rules">
                <h3>{t('common.rules')}:</h3>
                <ul>
                  <li>{t('games.hidden-number.instructions.grid')} {gridSize.rows}×{gridSize.cols}</li>
                  <li>{t('games.hidden-number.instructions.number')}</li>
                  <li>{t('games.hidden-number.instructions.find')}</li>
                  <li>{t('games.hidden-number.instructions.faster')}</li>
                </ul>
              </div>
              <div className="scoring-info">
                <h4>{t('games.hidden-number.instructions.scoring')}:</h4>
                <ul>
                  <li>{t('games.hidden-number.instructions.fast')}</li>
                  <li>{t('games.hidden-number.instructions.medium')}</li>
                  <li>{t('games.hidden-number.instructions.slow')}</li>
                </ul>
              </div>
              <p className="text-muted">{t('common.totalRounds')}: {ROUNDS.HIDDEN_NUMBER}</p>
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

    if (status === 'playing') {
      return (
        <div className="hidden-number-game">
          <div className="progress-container">
            <ProgressBar 
              current={currentRound} 
              total={ROUNDS.HIDDEN_NUMBER}
              label={`${t('common.round')} ${currentRound + 1} / ${ROUNDS.HIDDEN_NUMBER}`}
            />
          </div>

          <div className="instruction-text">
            {t('games.hidden-number.findNumber')} <span className="target-number">{targetNumber}</span>
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
                aria-label={t('games.hidden-number.cellWithNumber', { number })}
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
              {lastRoundTime ? `${(lastRoundTime / 1000).toFixed(2)}${t('common.sec')}` : ''}
            </div>
            <div className="feedback-points">
              +{lastRoundPoints} {t('common.points')}
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
            {t('games.hidden-number.completedRounds')}: {times.length} {t('common.of')} {ROUNDS.HIDDEN_NUMBER}
          </p>
        </div>

        <div className="stat-item highlight">
          <span className="stat-label">⚡ {t('games.hidden-number.bestTime')}:</span>
          <span className="stat-value stat-best">{(getBestTime() / 1000).toFixed(2)}{t('common.sec')}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">📊 {t('common.averageTime')}:</span>
          <span className="stat-value">{(getAverageTime() / 1000).toFixed(2)}{t('common.sec')}</span>
        </div>

        {times.length > 1 && (
          <div className="stat-item">
            <span className="stat-label">🐌 {t('games.hidden-number.worstTime')}:</span>
            <span className="stat-value stat-worst">{(getWorstTime() / 1000).toFixed(2)}{t('common.sec')}</span>
          </div>
        )}

        <div className="speed-breakdown">
          <h4>{t('games.hidden-number.speedDistribution')}:</h4>
          <div className="breakdown-item">
            <span>⚡ {t('games.hidden-number.fast')} (&lt; 3{t('common.sec')}):</span>
            <span>{fastRounds} {t('games.hidden-number.rounds')}</span>
          </div>
          <div className="breakdown-item">
            <span>🏃 {t('games.hidden-number.medium')} (3-5{t('common.sec')}):</span>
            <span>{mediumRounds} {t('games.hidden-number.rounds')}</span>
          </div>
          <div className="breakdown-item">
            <span>🐌 {t('games.hidden-number.slow')} (&gt; 5{t('common.sec')}):</span>
            <span>{slowRounds} {t('games.hidden-number.rounds')}</span>
          </div>
        </div>
      </div>
    );
  };

  const getMessage = () => {
    const avgTime = getAverageTime();
    const bestTime = getBestTime();
    
    if (bestTime < 2000) {
      return t('games.hidden-number.results.incredible');
    }
    if (avgTime < 3000) {
      return t('games.hidden-number.results.excellent');
    }
    if (avgTime < 4000) {
      return t('games.hidden-number.results.good');
    }
    if (avgTime < 5000) {
      return t('games.hidden-number.results.notBad');
    }
    return t('games.hidden-number.results.keepPracticing');
  };

  return (
    <GameLayout
      title={`🔢 ${t('games.hidden-number.title')}`}
      footerContent={
        (status === 'playing' || status === 'feedback') && (
          <div className="game-stats">
            <span>{t('common.round')}: {currentRound}/{ROUNDS.HIDDEN_NUMBER}</span>
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

export default HiddenNumber;

