import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout, ResultsModal, Button } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import { GAME_IDS, ROUNDS } from '../../../utils/constants';
import useColorTap from './useColorTap';
import './ColorTap.scss';

export interface ColorTapProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

export const ColorTap: React.FC<ColorTapProps> = ({ onBackToMenu, onNextGame }) => {
  const { t } = useTranslation();
  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
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
    if (status === 'results' && !scoreAddedRef.current) {
      if (currentScore > 0) {
        addScore(GAME_IDS.COLOR_TAP, currentScore);
      }
      addGameResult({
        gameId: GAME_IDS.COLOR_TAP,
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
        <div className="color-tap-intro">
          <div className="intro-card">
            <h2>🎨 {t('games.color-tap.title')}</h2>
            <div className="intro-instructions">
              <p className="lead">{t('games.color-tap.instructions.lead')}</p>
              <div className="rules">
                <h3>{t('common.rules')}:</h3>
                <ul>
                  <li>{t('games.color-tap.instructions.greenYes')}</li>
                  <li>{t('games.color-tap.instructions.redNo')}</li>
                  <li>{t('games.color-tap.instructions.fastBonus')}</li>
                </ul>
              </div>
              <div className="scoring-info">
                <p><strong>{t('games.color-tap.instructions.scoring')}:</strong></p>
                <ul>
                  <li>{t('games.color-tap.instructions.correct')}</li>
                  <li>{t('games.color-tap.instructions.fast')}</li>
                </ul>
              </div>
              <p className="text-muted">{t('common.totalRounds')}: {ROUNDS.COLOR_TAP}</p>
            </div>
            <Button
              variant="primary"
              size="large"
              onClick={startGame}
              fullWidth
            >
              {t('common.startGame')}
            </Button>
          </div>
        </div>
      );
    }

    if (status === 'playing') {
      return (
        <div className="color-tap-game">
          <div className="round-indicator">
            {t('games.color-tap.round')} {currentRound + 1} / {ROUNDS.COLOR_TAP}
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
              ✓ {t('games.color-tap.yes')}
            </Button>
            <Button
              variant="danger"
              size="large"
              onClick={() => handleAnswer(false)}
              fullWidth
              className="answer-btn no-btn"
            >
              ✗ {t('games.color-tap.no')}
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
                <div className="feedback-text">{t('games.color-tap.correct')}</div>
              </>
            ) : (
              <>
                <div className="feedback-icon">✗</div>
                <div className="feedback-text">{t('games.color-tap.incorrect')}</div>
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
            {t('games.color-tap.correctAnswers')}: {correctAnswers} {t('common.of')} {ROUNDS.COLOR_TAP}
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

        <div className="stat-item">
          <span className="stat-label">⚡ {t('games.color-tap.fastAnswers')}:</span>
          <span className="stat-value">{getFastAnswers()}</span>
        </div>
      </div>
    );
  };

  const getMessage = () => {
    const accuracy = getAccuracy();
    const fastAnswers = getFastAnswers();
    
    if (accuracy === 100 && fastAnswers >= 15) {
      return t('games.color-tap.results.perfect');
    }
    if (accuracy >= 90) {
      return t('games.color-tap.results.excellent');
    }
    if (accuracy >= 75) {
      return t('games.color-tap.results.good');
    }
    if (accuracy >= 60) {
      return t('games.color-tap.results.notBad');
    }
    return t('games.color-tap.results.keepPracticing');
  };

  return (
    <GameLayout
      title={`🎨 ${t('games.color-tap.title')}`}
      footerContent={
        (status === 'playing' || status === 'feedback') && (
          <div className="game-stats">
            <span>{t('common.correct')}: {correctAnswers}/{currentRound}</span>
            <span>{t('common.score')}: {currentScore.toFixed(1)}</span>
          </div>
        )
      }
    >
      {renderContent()}

      <ResultsModal
        show={status === 'results'}
        title={`🎮 ${t('common.gameOver')}`}
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

