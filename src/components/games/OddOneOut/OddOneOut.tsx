import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      case 'easy': return t('common.difficulty.easy');
      case 'medium': return t('common.difficulty.medium');
      case 'hard': return t('common.difficulty.hard');
      default: return '';
    }
  };

  const renderContent = () => {
    if (status === 'intro') {
      return (
        <div className="odd-one-out-intro">
          <div className="intro-card">
            <h2>🔍 {t('oddOneOut.title')}</h2>
            <div className="intro-instructions">
              <p className="lead">{t('oddOneOut.description')}</p>
              <div className="rules">
                <h3>{t('common.rules')}:</h3>
                <ul>
                  <li>{t('oddOneOut.instructions.look')}</li>
                  <li>{t('oddOneOut.instructions.find')}</li>
                  <li>{t('oddOneOut.instructions.tap')}</li>
                  <li>{t('oddOneOut.instructions.difficulty')}</li>
                </ul>
              </div>
              <div className="difficulty-info">
                <h4>{t('oddOneOut.difficultyLevels')}:</h4>
                <ul>
                  <li>🟢 {t('oddOneOut.rounds1to3')}: <strong>3×3</strong> ({t('common.difficulty.easy')})</li>
                  <li>🟡 {t('oddOneOut.rounds4to7')}: <strong>4×4</strong> ({t('common.difficulty.medium')})</li>
                  <li>🔴 {t('oddOneOut.rounds8to10')}: <strong>5×5</strong> ({t('common.difficulty.hard')})</li>
                </ul>
              </div>
              <div className="scoring-info">
                <p><strong>{t('common.score')}:</strong> {t('oddOneOut.pointsPerCorrect')}</p>
              </div>
              <p className="text-muted">{t('common.totalRounds')}: {ROUNDS.ODD_ONE_OUT}</p>
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
        <div className="odd-one-out-game">
          <div className="progress-container">
            <ProgressBar 
              current={currentRound} 
              total={ROUNDS.ODD_ONE_OUT}
              label={`${t('common.round')} ${currentRound + 1} / ${ROUNDS.ODD_ONE_OUT}`}
            />
          </div>

          <div className="difficulty-badge">
            <span className={`badge badge-${currentDifficulty}`}>
              {getDifficultyLabel(currentDifficulty)} ({gridSize}×{gridSize})
            </span>
          </div>

          <div className="instruction-text">
            {t('oddOneOut.findOdd')}
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
                aria-label={t('oddOneOut.selectSymbol', { number: index + 1 })}
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
                <div className="feedback-text">{t('common.correct')}</div>
              </>
            ) : (
              <>
                <div className="feedback-icon">✗</div>
                <div className="feedback-text">{t('common.incorrect')}</div>
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
            {t('common.correctAnswers')}: {correctAnswers} {t('common.of')} {ROUNDS.ODD_ONE_OUT}
          </p>
        </div>

        <div className="stat-item highlight">
          <span className="stat-label">🎯 {t('common.accuracy')}:</span>
          <span className="stat-value stat-best">{getAccuracy()}%</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">⏱️ {t('common.averageTime')}:</span>
          <span className="stat-value">{getAverageTime()}{t('common.ms')}</span>
        </div>

        <div className="difficulty-breakdown">
          <h4>{t('oddOneOut.byDifficulty')}:</h4>
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
      return t('oddOneOut.results.perfect');
    }
    if (accuracy >= 90) {
      return t('oddOneOut.results.excellent');
    }
    if (accuracy >= 70) {
      return t('oddOneOut.results.good');
    }
    if (accuracy >= 50) {
      return t('oddOneOut.results.notBad');
    }
    return t('oddOneOut.results.keepPracticing');
  };

  return (
    <GameLayout
      title={`🔍 ${t('oddOneOut.title')}`}
      footerContent={
        (status === 'playing' || status === 'feedback') && (
          <div className="game-stats">
            <span>{t('common.correct')}: {correctAnswers}/{currentRound}</span>
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

export default OddOneOut;

