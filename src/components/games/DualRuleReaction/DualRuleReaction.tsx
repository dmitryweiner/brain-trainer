import { useEffect, useRef } from 'react';
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
      title="↔️ Dual-Rule Reaction"
      onBack={onBack}
      footer={
        status === 'playing' || status === 'feedback' ? (
          <div className="dual-rule-stats">
            <div className="stat-item">
              <span className="stat-label">Раунд:</span>
              <span className="stat-value">{currentRound} / {TOTAL_ROUNDS}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Ошибки:</span>
              <span className="stat-value">{errors}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Очки:</span>
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
            <h2>Dual-Rule Reaction</h2>
            <p className="game-description">Тренировка когнитивной гибкости</p>
            <div className="game-rules">
              <h3>Как играть:</h3>
              <ul>
                <li>Показывается фигура с цветом</li>
                <li>Нажимайте кнопку A или B по правилу</li>
                <li>Раунды 1-15: по форме (🔵 → A, 🟥 → B)</li>
                <li>Раунды 16-30: правило меняется!</li>
                <li>Догадайтесь сами, какое новое правило</li>
                <li>Правильный ответ: +1 очко</li>
                <li>Ошибка: -0.5 очка</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              Начать игру
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
                label={`Раунд ${currentRound} / ${TOTAL_ROUNDS}`}
              />
            </div>

            {showRuleHint && (
              <div className="rule-hint">
                <p>🔵 Круг → A, 🟥 Квадрат → B</p>
              </div>
            )}

            <div className="stimulus-container">
              <div className={getShapeClass()}>
                {shape === 'circle' ? '●' : '■'}
              </div>
            </div>

            {status === 'feedback' && (
              <div className={`feedback-indicator ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
                {lastAnswerCorrect ? '✓ Правильно' : '✗ Неправильно'}
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
            title="Игра завершена!"
            score={Math.round(score)}
            message={
              accuracy >= 80
                ? 'Отличная когнитивная гибкость!'
                : accuracy >= 60
                ? 'Хороший результат, продолжайте тренироваться!'
                : 'Попробуйте ещё раз, будьте внимательнее!'
            }
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="dual-rule-results-details">
                <div className="results-section">
                  <h4>Точность</h4>
                  <p className="big-number">{accuracy}%</p>
                  <p className="stat-detail">
                    {TOTAL_ROUNDS - errors} из {TOTAL_ROUNDS} правильных
                  </p>
                </div>
                <div className="results-section">
                  <h4>Среднее время реакции</h4>
                  <p className="big-number">{calculateAverageReactionTime()} мс</p>
                </div>
                <div className="results-section">
                  <h4>Всего ошибок</h4>
                  <p className="big-number">{errors}</p>
                </div>
                <div className="results-section">
                  <h4>Всего очков</h4>
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

