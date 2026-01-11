import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout, ResultsModal, ProgressBar } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import { GAME_IDS, ROUNDS } from '../../../utils/constants';
import useEmojiHunt from './useEmojiHunt';
import './EmojiHunt.scss';

export interface EmojiHuntProps {
  onBack: () => void;
}

export const EmojiHunt: React.FC<EmojiHuntProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);
  const {
    status,
    currentRound,
    grid,
    gridSize,
    targetEmoji,
    correctAnswers,
    results,
    currentScore,
    lastAnswerCorrect,
    currentDifficulty,
    startGame,
    handleCellClick,
    playAgain,
    getAccuracy,
    getAverageTime,
  } = useEmojiHunt();

  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      if (currentScore > 0) {
        addScore(GAME_IDS.EMOJI_HUNT, currentScore);
      }
      addGameResult({
        gameId: GAME_IDS.EMOJI_HUNT,
        score: currentScore,
        accuracy: getAccuracy(),
        averageTime: getAverageTime() || 0,
      });
      scoreAddedRef.current = true;
    }
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
        <div className="emoji-hunt-intro">
          <div className="intro-card">
            <h2>🔎 {t('emojiHunt.title')}</h2>
            <div className="intro-instructions">
              <p className="lead">{t('emojiHunt.description')}</p>
              <div className="rules">
                <h3>{t('common.rules')}:</h3>
                <ul>
                  <li>{t('emojiHunt.instructions.find')}</li>
                  <li>{t('emojiHunt.instructions.tap')}</li>
                  <li>{t('emojiHunt.instructions.difficulty')}</li>
                </ul>
              </div>
              <div className="difficulty-info">
                <h4>{t('results.byDifficulty')}:</h4>
                <ul>
                  <li>🟢 {t('emojiHunt.rounds.easy')}: <strong>5×5</strong>, {t('emojiHunt.differentEmojis')}</li>
                  <li>🟡 {t('emojiHunt.rounds.medium')}: <strong>6×6</strong>, {t('emojiHunt.similarSmileys')}</li>
                  <li>🔴 {t('emojiHunt.rounds.hard')}: <strong>8×8</strong>, {t('emojiHunt.verySimilar')}</li>
                </ul>
              </div>
              <div className="scoring-info">
                <p><strong>{t('emojiHunt.scoring')}</strong></p>
              </div>
              <p className="text-muted">{t('common.round')}: {ROUNDS.EMOJI_HUNT}</p>
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
        <div className="emoji-hunt-game">
          <div className="progress-container">
            <ProgressBar 
              current={currentRound} 
              total={ROUNDS.EMOJI_HUNT}
              label={`${t('common.round')} ${currentRound + 1} / ${ROUNDS.EMOJI_HUNT}`}
            />
          </div>

          <div className="difficulty-badge">
            <span className={`badge badge-${currentDifficulty}`}>
              {getDifficultyLabel(currentDifficulty)} ({gridSize}×{gridSize})
            </span>
          </div>

          <div className="target-section">
            <span className="target-label">{t('common.find')}:</span>
            <span className="target-emoji">{targetEmoji}</span>
          </div>

          <div 
            className="emoji-grid"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            }}
          >
            {grid.map((emoji, index) => (
              <button
                key={index}
                className="emoji-cell"
                onClick={() => handleCellClick(index)}
                aria-label={`Cell ${index + 1}`}
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
        <div className="emoji-hunt-feedback">
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
            {t('common.correctAnswers')}: {correctAnswers} / {ROUNDS.EMOJI_HUNT}
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
          <h4>{t('results.byDifficulty')}:</h4>
          <div className="breakdown-item">
            <span>🟢 5×5 (1-3):</span>
            <span>{easyCorrect} / {results.filter(r => r.difficulty === 'easy').length}</span>
          </div>
          <div className="breakdown-item">
            <span>🟡 6×6 (4-6):</span>
            <span>{mediumCorrect} / {results.filter(r => r.difficulty === 'medium').length}</span>
          </div>
          <div className="breakdown-item">
            <span>🔴 8×8 (7-10):</span>
            <span>{hardCorrect} / {results.filter(r => r.difficulty === 'hard').length}</span>
          </div>
        </div>
      </div>
    );
  };

  const getMessage = () => {
    const accuracy = getAccuracy();
    
    if (accuracy === 100) {
      return `🏆 ${t('results.perfectScore')}`;
    }
    if (accuracy >= 90) {
      return `⭐ ${t('results.excellent')}`;
    }
    if (accuracy >= 70) {
      return `👍 ${t('results.good')}`;
    }
    if (accuracy >= 50) {
      return `💪 ${t('results.notBad')}`;
    }
    return `🎯 ${t('results.keepPracticing')}`;
  };

  return (
    <GameLayout
      title={`🔎 ${t('emojiHunt.title')}`}
      footer={
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
        onBackToMenu={onBack}
      />
    </GameLayout>
  );
};

export default EmojiHunt;
