import { useEffect, useRef } from 'react';
import { useSequenceRecall } from './useSequenceRecall';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import GameLayout from '../../common/GameLayout';
import Button from '../../common/Button';
import ResultsModal from '../../common/ResultsModal';
import ProgressBar from '../../common/ProgressBar';
import './SequenceRecall.scss';

interface SequenceRecallProps {
  onBack: () => void;
}

const MAX_LENGTH = 7;
const INITIAL_LENGTH = 3;

export default function SequenceRecall({ onBack }: SequenceRecallProps) {
  const {
    status,
    sequence,
    userSequence,
    options,
    currentLength,
    currentEmoji,
    totalScore,
    correctSequences,
    lastAnswerCorrect,
    startGame,
    handleOptionClick,
  } = useSequenceRecall();

  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);

  // Добавляем очки в контекст при завершении игры
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      addScore('sequence-recall', totalScore);
      // Accuracy based on correct sequences vs possible sequences
      const maxPossible = MAX_LENGTH - INITIAL_LENGTH + 1;
      const accuracy = Math.round((correctSequences / maxPossible) * 100);
      addGameResult({
        gameId: 'sequence-recall',
        score: totalScore,
        accuracy: Math.min(accuracy, 100),
        averageTime: 0, // No time tracking in this game
      });
      scoreAddedRef.current = true;
    }
  }, [status, totalScore, addScore, addGameResult, correctSequences]);

  return (
    <GameLayout
      title="🧠 Sequence Recall"
      onBack={onBack}
      footer={
        status === 'input' ? (
          <div className="sequence-recall-stats">
            <div className="stat-item">
              <span className="stat-label">Длина:</span>
              <span className="stat-value">{currentLength}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Введено:</span>
              <span className="stat-value">{userSequence.length} / {sequence.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Очки:</span>
              <span className="stat-value">{totalScore}</span>
            </div>
          </div>
        ) : null
      }
    >
      <div className="sequence-recall">
        {/* Intro Screen */}
        {status === 'intro' && (
          <div className="sequence-recall-intro">
            <div className="game-icon">🧠</div>
            <h2>Sequence Recall</h2>
            <p className="game-description">Тренировка визуальной рабочей памяти</p>
            <div className="game-rules">
              <h3>Как играть:</h3>
              <ul>
                <li>Запомните последовательность эмодзи</li>
                <li>Воспроизведите её в правильном порядке</li>
                <li>Начальная длина: 3 элемента</li>
                <li>При успехе: +1 элемент (макс. 7)</li>
                <li>При ошибке: игра завершается</li>
                <li>Очки = длина последовательности</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              Начать игру
            </Button>
          </div>
        )}

        {/* Showing Screen */}
        {status === 'showing' && (
          <div className="sequence-recall-showing">
            <div className="sequence-info">
              <h3>Запомните последовательность</h3>
              <ProgressBar
                current={userSequence.length + 1}
                total={MAX_LENGTH}
                label={`Уровень ${currentLength}`}
              />
            </div>

            <div className="emoji-display">
              {currentEmoji ? (
                <div className="emoji-large animate-show">{currentEmoji}</div>
              ) : (
                <div className="emoji-placeholder">...</div>
              )}
            </div>

            <div className="showing-hint">
              Эмодзи {userSequence.length + 1} из {sequence.length}
            </div>
          </div>
        )}

        {/* Input Screen */}
        {status === 'input' && (
          <div className="sequence-recall-input">
            <div className="sequence-info">
              <h3>Повторите последовательность</h3>
              <ProgressBar
                current={currentLength}
                total={MAX_LENGTH}
                label={`Уровень ${currentLength}`}
              />
            </div>

            <div className="user-sequence-display">
              {userSequence.map((emoji, index) => (
                <span key={index} className="user-emoji">
                  {emoji}
                </span>
              ))}
              {userSequence.length < sequence.length && (
                <span className="current-position">▸</span>
              )}
            </div>

            <div className="options-grid">
              {options.map((emoji, index) => (
                <button
                  key={index}
                  className="option-button"
                  onClick={() => handleOptionClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Screen */}
        {status === 'feedback' && (
          <div className="sequence-recall-feedback">
            <div className={`feedback-indicator ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}>
              <div className="feedback-icon">
                {lastAnswerCorrect ? '✓' : '✗'}
              </div>
              <div className="feedback-text">
                {lastAnswerCorrect
                  ? `Отлично! +${currentLength} очков`
                  : 'Ошибка!'}
              </div>
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
              <div className="sequence-recall-results-details">
                <div className="results-section">
                  <h4>Правильных последовательностей</h4>
                  <p className="big-number">{correctSequences}</p>
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

