import { useEffect, useRef } from 'react';
import { useNBack } from './useNBack';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import GameLayout from '../../common/GameLayout';
import Button from '../../common/Button';
import ResultsModal from '../../common/ResultsModal';
import ProgressBar from '../../common/ProgressBar';
import './NBack.scss';

interface NBackProps {
  onBack: () => void;
}

const ITEMS_PER_BLOCK = 20;
const TOTAL_BLOCKS = 3;

export default function NBack({ onBack }: NBackProps) {
  const {
    status,
    currentIndex,
    currentBlock,
    currentEmoji,
    history,
    hits,
    misses,
    falseAlarms,
    correctRejections,
    score,
    canAnswer,
    startGame,
    handleMatch,
  } = useNBack();

  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);

  // Добавляем очки в контекст при завершении игры
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      addScore('n-back', Math.round(score));
      // Calculate accuracy
      const totalResponses = hits + misses + falseAlarms + correctRejections;
      const accuracy = totalResponses > 0 
        ? Math.round(((hits + correctRejections) / totalResponses) * 100)
        : 0;
      addGameResult({
        gameId: 'n-back',
        score: Math.round(score),
        accuracy,
        averageTime: 0, // N-back doesn't track reaction time per item
      });
      scoreAddedRef.current = true;
    }
  }, [status, score, addScore, addGameResult, hits, misses, falseAlarms, correctRejections]);

  const totalItems = ITEMS_PER_BLOCK * TOTAL_BLOCKS;
  const totalAttempts = currentIndex + 1 + (currentBlock - 1) * ITEMS_PER_BLOCK;
  const accuracy =
    hits + misses + falseAlarms + correctRejections > 0
      ? Math.round(
          ((hits + correctRejections) / (hits + misses + falseAlarms + correctRejections)) * 100
        )
      : 0;

  return (
    <GameLayout
      title="🔄 N-Back"
      onBack={onBack}
      footer={
        status === 'playing' ? (
          <div className="n-back-stats">
            <div className="stat-item">
              <span className="stat-label">Блок:</span>
              <span className="stat-value">{currentBlock} / {TOTAL_BLOCKS}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Позиция:</span>
              <span className="stat-value">{currentIndex + 1} / {ITEMS_PER_BLOCK}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Попадания:</span>
              <span className="stat-value">{hits}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Пропуски:</span>
              <span className="stat-value">{misses}</span>
            </div>
          </div>
        ) : null
      }
    >
      <div className="n-back">
        {/* Intro Screen */}
        {status === 'intro' && (
          <div className="n-back-intro">
            <div className="game-icon">🔄</div>
            <h2>N-Back (2-back)</h2>
            <p className="game-description">Тренировка рабочей памяти</p>
            <div className="game-rules">
              <h3>Как играть:</h3>
              <ul>
                <li>Эмодзи появляются по одному каждые 2.5 сек</li>
                <li>Нажимайте "Совпадает", если текущий эмодзи совпадает с тем, что был <strong>2 шага назад</strong></li>
                <li>Если не совпадает - ничего не нажимайте</li>
                <li>3 блока по 20 элементов (всего 60)</li>
                <li>Правильное нажатие: +1 очко</li>
                <li>Правильный пропуск: +0.5 очка</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              Начать игру
            </Button>
          </div>
        )}

        {/* Playing Screen */}
        {status === 'playing' && (
          <div className="n-back-playing">
            <div className="progress-section">
              <ProgressBar
                current={totalAttempts}
                total={totalItems}
                label={`Блок ${currentBlock} / ${TOTAL_BLOCKS}`}
              />
            </div>

            {/* История */}
            <div className="history-section">
              <div className="history-label">История (2 шага назад):</div>
              <div className="history-emojis">
                {history.length > 0 ? (
                  history.map((emoji, index) => (
                    <span key={index} className="history-emoji">
                      {emoji}
                    </span>
                  ))
                ) : (
                  <span className="history-placeholder">—</span>
                )}
              </div>
            </div>

            {/* Текущий эмодзи */}
            <div className="current-emoji-container">
              {currentEmoji ? (
                <div className="current-emoji animate-appear">{currentEmoji}</div>
              ) : (
                <div className="emoji-placeholder">...</div>
              )}
            </div>

            {/* Кнопка ответа */}
            <div className="answer-section">
              <Button
                variant="primary"
                size="lg"
                onClick={handleMatch}
                disabled={!canAnswer}
                className="match-button"
              >
                ✓ Совпадает
              </Button>
              <p className="answer-hint">
                {currentIndex < 2
                  ? 'Запоминайте последовательность...'
                  : 'Нажмите, если совпадает с элементом 2 шага назад'}
              </p>
            </div>
          </div>
        )}

        {/* Block Pause Screen */}
        {status === 'blockPause' && (
          <div className="n-back-block-pause">
            <div className="pause-message">
              <h3>Блок {currentBlock - 1} завершен!</h3>
              <p>Готовьтесь к блоку {currentBlock}...</p>
              <div className="pause-stats">
                <div className="stat">
                  <span className="stat-label">Попадания:</span>
                  <span className="stat-value">{hits}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Пропуски:</span>
                  <span className="stat-value">{misses}</span>
                </div>
              </div>
            </div>
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
                ? 'Отличная рабочая память!'
                : accuracy >= 60
                ? 'Хороший результат!'
                : 'Продолжайте тренироваться!'
            }
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="n-back-results-details">
                <div className="results-section">
                  <h4>Точность</h4>
                  <p className="big-number">{accuracy}%</p>
                </div>
                <div className="results-section">
                  <h4>Попадания</h4>
                  <p className="big-number">{hits}</p>
                  <p className="stat-detail">+{hits} очков</p>
                </div>
                <div className="results-section">
                  <h4>Правильные пропуски</h4>
                  <p className="big-number">{correctRejections}</p>
                  <p className="stat-detail">+{(correctRejections * 0.5).toFixed(1)} очков</p>
                </div>
                <div className="results-section">
                  <h4>Пропуски совпадений</h4>
                  <p className="big-number">{misses}</p>
                </div>
                <div className="results-section">
                  <h4>Ложные тревоги</h4>
                  <p className="big-number">{falseAlarms}</p>
                </div>
                <div className="results-section results-total">
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

