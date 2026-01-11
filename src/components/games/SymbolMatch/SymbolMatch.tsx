import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            <h2>🔄 {t('games.symbol-match.title')}</h2>
            <div className="intro-instructions">
              <p className="lead">{t('games.symbol-match.instructions.lead')}</p>
              <div className="rules">
                <h3>{t('common.rules')}:</h3>
                <ul>
                  <li>{t('games.symbol-match.instructions.look')}</li>
                  <li>{t('games.symbol-match.instructions.decide')}</li>
                  <li>{t('games.symbol-match.instructions.press')}</li>
                  <li>{t('games.symbol-match.instructions.beAttentive')}</li>
                </ul>
              </div>
              <div className="scoring-info">
                <p><strong>{t('games.symbol-match.instructions.scoring')}</strong></p>
              </div>
              <p className="text-muted">{t('common.totalRounds')}: {ROUNDS.SYMBOL_MATCH}</p>
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
        <div className="symbol-match-game">
          <div className="progress-container">
            <ProgressBar 
              current={currentRound} 
              total={ROUNDS.SYMBOL_MATCH}
              label={`${t('common.round')} ${currentRound + 1} / ${ROUNDS.SYMBOL_MATCH}`}
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
              ✓ {t('games.symbol-match.match')}
            </button>
            <button
              className="btn btn-danger btn-large answer-btn no-match-btn"
              onClick={() => handleAnswer(false)}
            >
              ✗ {t('games.symbol-match.noMatch')}
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
    return (
      <div className="results-details">
        <div className="results-summary">
          <p className="summary-text">
            {t('games.symbol-match.correctAnswers')}: {correctAnswers} {t('common.of')} {ROUNDS.SYMBOL_MATCH}
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
      </div>
    );
  };

  const getMessage = () => {
    const accuracy = getAccuracy();
    
    if (accuracy === 100) {
      return t('games.symbol-match.results.perfect');
    }
    if (accuracy >= 90) {
      return t('games.symbol-match.results.excellent');
    }
    if (accuracy >= 75) {
      return t('games.symbol-match.results.good');
    }
    if (accuracy >= 60) {
      return t('games.symbol-match.results.notBad');
    }
    return t('games.symbol-match.results.keepPracticing');
  };

  return (
    <GameLayout
      title={`🔄 ${t('games.symbol-match.title')}`}
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

export default SymbolMatch;

