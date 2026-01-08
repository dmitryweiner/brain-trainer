import { useEffect, useRef } from 'react';
import { usePhoneRecall } from './usePhoneRecall';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import GameLayout from '../../common/GameLayout';
import Button from '../../common/Button';
import ResultsModal from '../../common/ResultsModal';
import ProgressBar from '../../common/ProgressBar';
import './PhoneRecall.scss';

interface PhoneRecallProps {
  onBack: () => void;
}

const MAX_LENGTH = 12;
const INITIAL_LENGTH = 4;

export default function PhoneRecall({ onBack }: PhoneRecallProps) {
  const {
    status,
    number,
    userInput,
    currentLength,
    totalScore,
    correctNumbers,
    lastAnswerCorrect,
    memorizeTimeLeft,
    startGame,
    handleDigitClick,
    handleBackspace,
    handleSubmit,
  } = usePhoneRecall();

  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);

  // Добавляем очки в контекст при завершении игры
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      addScore('phone-recall', totalScore);
      // Accuracy based on how many numbers correctly recalled
      const maxPossible = MAX_LENGTH - INITIAL_LENGTH + 1;
      const accuracy = Math.round((correctNumbers / maxPossible) * 100);
      addGameResult({
        gameId: 'phone-recall',
        score: totalScore,
        accuracy: Math.min(accuracy, 100),
        averageTime: 0, // No reaction time tracking
      });
      scoreAddedRef.current = true;
    }
  }, [status, totalScore, addScore, addGameResult, correctNumbers]);

  // Обработка клавиатуры
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'input') return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleDigitClick, handleBackspace, handleSubmit]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <GameLayout
      title="📞 Phone Recall"
      onBack={onBack}
      footer={
        status === 'input' ? (
          <div className="phone-recall-stats">
            <div className="stat-item">
              <span className="stat-label">Длина:</span>
              <span className="stat-value">{currentLength}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Очки:</span>
              <span className="stat-value">{totalScore}</span>
            </div>
          </div>
        ) : null
      }
    >
      <div className="phone-recall">
        {/* Intro Screen */}
        {status === 'intro' && (
          <div className="phone-recall-intro">
            <div className="game-icon">📞</div>
            <h2>Phone Recall</h2>
            <p className="game-description">Тренировка числовой памяти</p>
            <div className="game-rules">
              <h3>Как играть:</h3>
              <ul>
                <li>Запомните показанный номер</li>
                <li>Введите его по памяти</li>
                <li>Начальная длина: 4 цифры</li>
                <li>При успехе: +1 цифра (макс. 12)</li>
                <li>При ошибке: игра завершается</li>
                <li>Очки = длина числа</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              Начать игру
            </Button>
          </div>
        )}

        {/* Memorize Screen */}
        {status === 'memorize' && (
          <div className="phone-recall-memorize">
            <div className="memorize-info">
              <h3>Запомните номер</h3>
              <ProgressBar
                current={currentLength - 3}
                total={MAX_LENGTH - 3}
                label={`Уровень ${currentLength - 3}`}
              />
            </div>

            <div className="number-display">
              <div className="number-large animate-show">{number}</div>
            </div>

            <div className="timer-display">
              <span className="timer-value">{memorizeTimeLeft}</span>
              <span className="timer-label">сек</span>
            </div>
          </div>
        )}

        {/* Input Screen */}
        {status === 'input' && (
          <div className="phone-recall-input">
            <div className="input-info">
              <h3>Введите номер</h3>
              <ProgressBar
                current={currentLength - 3}
                total={MAX_LENGTH - 3}
                label={`Уровень ${currentLength - 3}`}
              />
            </div>

            <div className="user-input-display">
              <div className="input-digits">
                {Array.from({ length: currentLength }).map((_, index) => (
                  <span
                    key={index}
                    className={`digit-slot ${index < userInput.length ? 'filled' : ''} ${
                      index === userInput.length ? 'current' : ''
                    }`}
                  >
                    {userInput[index] || ''}
                  </span>
                ))}
              </div>
            </div>

            <div className="numpad">
              {digits.slice(0, 9).map((digit) => (
                <button
                  key={digit}
                  className="numpad-button"
                  onClick={() => handleDigitClick(digit)}
                >
                  {digit}
                </button>
              ))}
              <button
                className="numpad-button backspace"
                onClick={handleBackspace}
              >
                ⌫
              </button>
              <button
                className="numpad-button"
                onClick={() => handleDigitClick('0')}
              >
                0
              </button>
              <button
                className="numpad-button submit"
                onClick={handleSubmit}
                disabled={userInput.length !== currentLength}
              >
                ✓
              </button>
            </div>
          </div>
        )}

        {/* Feedback Screen */}
        {status === 'feedback' && (
          <div className="phone-recall-feedback">
            <div className={`feedback-indicator ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
              <div className="feedback-icon">
                {lastAnswerCorrect ? '✓' : '✗'}
              </div>
              <div className="feedback-text">
                {lastAnswerCorrect
                  ? `Отлично! +${currentLength} очков`
                  : 'Ошибка!'}
              </div>
              {!lastAnswerCorrect && (
                <div className="correct-answer">
                  Правильный ответ: {number}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Screen */}
        {status === 'results' && (
          <ResultsModal
            show={true}
            title={lastAnswerCorrect ? 'Максимум достигнут!' : 'Игра завершена!'}
            score={totalScore}
            message={
              lastAnswerCorrect
                ? `Поздравляем! Вы достигли максимальной длины ${MAX_LENGTH}!`
                : 'Попробуйте ещё раз улучшить результат!'
            }
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="phone-recall-results-details">
                <div className="results-section">
                  <h4>Правильных номеров</h4>
                  <p className="big-number">{correctNumbers}</p>
                </div>
                <div className="results-section">
                  <h4>Максимальная длина</h4>
                  <p className="big-number">{lastAnswerCorrect ? MAX_LENGTH : currentLength - 1}</p>
                </div>
                <div className="results-section">
                  <h4>Всего очков</h4>
                  <p className="big-number">🏆 {totalScore}</p>
                </div>
              </div>
            }
          />
        )}
      </div>
    </GameLayout>
  );
}

