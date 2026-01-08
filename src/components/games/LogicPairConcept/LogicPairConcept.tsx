import { useEffect, useRef } from 'react';
import { useLogicPairConcept } from './useLogicPairConcept';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import GameLayout from '../../common/GameLayout';
import Button from '../../common/Button';
import ResultsModal from '../../common/ResultsModal';
import ProgressBar from '../../common/ProgressBar';
import './LogicPairConcept.scss';

interface LogicPairConceptProps {
  onBack: () => void;
}

const TOTAL_ROUNDS = 10;

export default function LogicPairConcept({ onBack }: LogicPairConceptProps) {
  const {
    status,
    currentRound,
    items,
    selectedItems,
    correctAnswers,
    score,
    lastAnswerCorrect,
    canSubmit,
    startGame,
    handleItemClick,
    handleSubmit,
    handleContinue,
  } = useLogicPairConcept();

  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);

  // Добавляем очки в контекст при завершении игры
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      addScore('logic-pair-concept', score);
      const accuracy = Math.round((correctAnswers / TOTAL_ROUNDS) * 100);
      addGameResult({
        gameId: 'logic-pair-concept',
        score,
        accuracy,
        averageTime: 0, // No time tracking
      });
      scoreAddedRef.current = true;
    }
  }, [status, score, addScore, addGameResult, correctAnswers]);

  const accuracy = TOTAL_ROUNDS > 0
    ? Math.round((correctAnswers / TOTAL_ROUNDS) * 100)
    : 0;

  return (
    <GameLayout
      title="💡 Logic Pair Concept"
      onBack={onBack}
      footer={
        status === 'playing' ? (
          <div className="logic-pair-stats">
            <div className="stat-item">
              <span className="stat-label">Раунд:</span>
              <span className="stat-value">{currentRound} / {TOTAL_ROUNDS}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Правильных:</span>
              <span className="stat-value">{correctAnswers}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Очки:</span>
              <span className="stat-value">{score}</span>
            </div>
          </div>
        ) : null
      }
    >
      <div className="logic-pair-concept">
        {/* Intro Screen */}
        {status === 'intro' && (
          <div className="logic-pair-intro">
            <div className="game-icon">💡</div>
            <h2>Logic Pair Concept</h2>
            <p className="game-description">Тренировка абстрактного мышления</p>
            <div className="game-rules">
              <h3>Как играть:</h3>
              <ul>
                <li>Показываются 4 предмета</li>
                <li>Выберите 2 предмета, образующие смысловую пару</li>
                <li>Например: яблоко + апельсин (оба фрукты)</li>
                <li>10 раундов с разными категориями</li>
                <li>Правильная пара: +2 очка</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              Начать игру
            </Button>
          </div>
        )}

        {/* Playing Screen */}
        {status === 'playing' && (
          <div className="logic-pair-playing">
            <div className="progress-section">
              <ProgressBar
                current={currentRound}
                total={TOTAL_ROUNDS}
                label={`Раунд ${currentRound} / ${TOTAL_ROUNDS}`}
              />
            </div>

            <div className="instruction">
              <p>Выберите 2 предмета, образующие смысловую пару</p>
            </div>

            <div className="items-grid">
              {items.map((item, index) => (
                <button
                  key={index}
                  className={`item-button ${selectedItems.includes(index) ? 'selected' : ''}`}
                  onClick={() => handleItemClick(index)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="submit-section">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="submit-button"
              >
                Подтвердить выбор
              </Button>
              <p className="submit-hint">
                {selectedItems.length === 0 && 'Выберите 2 предмета'}
                {selectedItems.length === 1 && 'Выберите ещё 1 предмет'}
                {selectedItems.length === 2 && 'Нажмите "Подтвердить"'}
              </p>
            </div>
          </div>
        )}

        {/* Feedback Screen */}
        {status === 'feedback' && (
          <div className="logic-pair-feedback">
            <div className={`feedback-indicator ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
              <div className="feedback-icon">
                {lastAnswerCorrect ? '✓' : '✗'}
              </div>
              <div className="feedback-text">
                {lastAnswerCorrect ? 'Правильно! +2 очка' : 'Неправильно'}
              </div>
            </div>

            <div className="selected-items-display">
              <p className="selected-label">Ваш выбор:</p>
              <div className="selected-items">
                {selectedItems.map((index) => (
                  <div key={index} className="selected-item">
                    {items[index]}
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleContinue}
              className="continue-button"
            >
              {currentRound < TOTAL_ROUNDS ? 'Следующий раунд' : 'Результаты'}
            </Button>
          </div>
        )}

        {/* Results Screen */}
        {status === 'results' && (
          <ResultsModal
            show={true}
            title="Игра завершена!"
            score={score}
            message={
              accuracy >= 80
                ? 'Отличное логическое мышление!'
                : accuracy >= 60
                ? 'Хороший результат!'
                : 'Продолжайте тренироваться!'
            }
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="logic-pair-results-details">
                <div className="results-section">
                  <h4>Точность</h4>
                  <p className="big-number">{accuracy}%</p>
                  <p className="stat-detail">
                    {correctAnswers} из {TOTAL_ROUNDS} правильных
                  </p>
                </div>
                <div className="results-section">
                  <h4>Правильных ответов</h4>
                  <p className="big-number">{correctAnswers}</p>
                </div>
                <div className="results-section">
                  <h4>Неправильных ответов</h4>
                  <p className="big-number">{TOTAL_ROUNDS - correctAnswers}</p>
                </div>
                <div className="results-section results-total">
                  <h4>Всего очков</h4>
                  <p className="big-number">🏆 {score}</p>
                </div>
              </div>
            }
          />
        )}
      </div>
    </GameLayout>
  );
}

