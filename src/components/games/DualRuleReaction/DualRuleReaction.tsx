import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDualRuleReaction } from './useDualRuleReaction';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import GameLayout from '../../common/GameLayout';
import Button from '../../common/Button';
import ResultsModal from '../../common/ResultsModal';
import ProgressBar from '../../common/ProgressBar';
import './DualRuleReaction.scss';

interface DualRuleReactionProps {
  onBack: () => void;
}

const TOTAL_ROUNDS = 30;

export default function DualRuleReaction({ onBack }: DualRuleReactionProps) {
  const { t } = useTranslation();
  const {
    status,
    currentRound,
    shape,
    color,
    currentRule,
    errors,
    score,
    reactionTimes,
    lastAnswerCorrect,
    showRuleHint,
    startGame,
    handleAnswer,
    proceedToNextRound,
  } = useDualRuleReaction();

  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);

  // Добавляем очки в контекст при завершении игры
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      addScore('dual-rule-reaction', Math.round(score));
      // Calculate accuracy and average time
      const accuracy = Math.round(((TOTAL_ROUNDS - errors) / TOTAL_ROUNDS) * 100);
      const avgTime = reactionTimes.length > 0 
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
      addGameResult({
        gameId: 'dual-rule-reaction',
        score: Math.round(score),
        accuracy,
        averageTime: avgTime,
      });
      scoreAddedRef.current = true;
    }
  }, [status, score, addScore, addGameResult, errors, reactionTimes]);

  // Автоматический переход после feedback
  useEffect(() => {
    if (status === 'feedback') {
      const timeout = setTimeout(() => {
        proceedToNextRound();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [status, proceedToNextRound]);

  const getShapeClass = () => {
    return `shape ${shape} ${color}`;
  };

  const calculateAverageReactionTime = () => {
    if (reactionTimes.length === 0) return 0;
    const sum = reactionTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / reactionTimes.length);
  };

  const accuracy = reactionTimes.length > 0
    ? Math.round(((reactionTimes.length - errors) / reactionTimes.length) * 100)
    : 0;

  return (
    <GameLayout
      title={`↔️ ${t('games.dual-rule-reaction.title')}`}
      onBack={onBack}
      footer={
        status === 'playing' || status === 'feedback' ? (
          <div className="dual-rule-stats">
            <div className="stat-item">
              <span className="stat-label">{t('common.round')}:</span>
              <span className="stat-value">{currentRound} / {TOTAL_ROUNDS}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('games.dual-rule-reaction.errors')}:</span>
              <span className="stat-value">{errors}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('common.score')}:</span>
              <span className="stat-value">{score.toFixed(1)}</span>
            </div>
          </div>
        ) : null
      }
    >
      <div className="dual-rule-reaction">
        {/* Intro Screen */}
        {status === 'intro' && (
          <div className="dual-rule-intro">
            <div className="game-icon">↔️</div>
            <h2>{t('games.dual-rule-reaction.title')}</h2>
            <p className="game-description">{t('games.dual-rule-reaction.description')}</p>
            <div className="game-rules">
              <h3>{t('common.howToPlay')}:</h3>
              <ul>
                <li>{t('games.dual-rule-reaction.figureShown')}</li>
                <li>{t('games.dual-rule-reaction.pressAorB')}</li>
                <li>{t('games.dual-rule-reaction.rounds1to15')} (🔵 → A, 🟥 → B)</li>
                <li>{t('games.dual-rule-reaction.rounds16to30')}</li>
                <li>{t('games.dual-rule-reaction.guessNewRule')}</li>
                <li>{t('games.dual-rule-reaction.correctAnswer1point')}</li>
                <li>{t('games.dual-rule-reaction.errorMinus05')}</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              {t('common.startGame')}
            </Button>
          </div>
        )}

        {/* Playing Screen */}
        {(status === 'playing' || status === 'feedback') && (
          <div className="dual-rule-playing">
            <div className="progress-section">
              <ProgressBar
                current={currentRound}
                total={TOTAL_ROUNDS}
                label={`${t('common.round')} ${currentRound} / ${TOTAL_ROUNDS}`}
              />
            </div>

            {showRuleHint && (
              <div className="rule-hint">
                <p>🔵 {t('games.dual-rule-reaction.circleA')}, 🟥 {t('games.dual-rule-reaction.squareB')}</p>
              </div>
            )}

            <div className="stimulus-container">
              <div className={getShapeClass()}>
                {shape === 'circle' ? '●' : '■'}
              </div>
            </div>

            {status === 'feedback' && (
              <div className={`feedback-indicator ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
                {lastAnswerCorrect ? `✓ ${t('common.correct')}` : `✗ ${t('common.incorrect')}`}
              </div>
            )}

            {status === 'playing' && (
              <div className="answer-buttons">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleAnswer('A')}
                  className="answer-btn"
                >
                  A
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => handleAnswer('B')}
                  className="answer-btn"
                >
                  B
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Results Screen */}
        {status === 'results' && (
          <ResultsModal
            show={true}
            title={t('common.gameOver')}
            score={Math.round(score)}
            message={
              accuracy >= 80
                ? t('games.dual-rule-reaction.excellentFlexibility')
                : accuracy >= 60
                ? t('games.dual-rule-reaction.goodResultKeepPracticing')
                : t('games.dual-rule-reaction.tryAgainBeAttentive')
            }
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="dual-rule-results-details">
                <div className="results-section">
                  <h4>{t('common.accuracy')}</h4>
                  <p className="big-number">{accuracy}%</p>
                  <p className="stat-detail">
                    {TOTAL_ROUNDS - errors} {t('logicPair.outOf')} {TOTAL_ROUNDS} {t('common.correct')}
                  </p>
                </div>
                <div className="results-section">
                  <h4>{t('common.averageReactionTime')}</h4>
                  <p className="big-number">{calculateAverageReactionTime()} {t('common.ms')}</p>
                </div>
                <div className="results-section">
                  <h4>{t('games.dual-rule-reaction.totalErrors')}</h4>
                  <p className="big-number">{errors}</p>
                </div>
                <div className="results-section">
                  <h4>{t('results.totalPoints')}</h4>
                  <p className="big-number">🏆 {Math.round(score)}</p>
                </div>
              </div>
            }
          />
        )}
      </div>
    </GameLayout>
  );
}
