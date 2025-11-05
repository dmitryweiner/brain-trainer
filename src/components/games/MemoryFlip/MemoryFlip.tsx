import { useEffect, useRef } from 'react';
import { useMemoryFlip } from './useMemoryFlip';
import { useScore } from '../../../hooks/useScore';
import GameLayout from '../../common/GameLayout';
import Button from '../../common/Button';
import ResultsModal from '../../common/ResultsModal';
import { GRID_SIZES } from '../../../utils/constants';
import './MemoryFlip.scss';

interface MemoryFlipProps {
  onBack: () => void;
}

const LEVEL_GRID_KEYS = {
  1: 'MEMORY_FLIP_L1' as const,
  2: 'MEMORY_FLIP_L2' as const,
  3: 'MEMORY_FLIP_L3' as const,
  4: 'MEMORY_FLIP_L4' as const,
};

const LEVEL_NAMES = {
  1: '2×3 (6 карт)',
  2: '3×4 (12 карт)',
  3: '4×4 (16 карт)',
  4: '4×5 (20 карт)',
};

export default function MemoryFlip({ onBack }: MemoryFlipProps) {
  const {
    status,
    level,
    cards,
    moves,
    elapsedTime,
    totalScore,
    levelStats,
    startGame,
    handleCardClick,
    proceedToNextLevel,
  } = useMemoryFlip();

  const { addScore } = useScore();
  const scoreAddedRef = useRef(false);

  // Добавляем очки в контекст при завершении игры
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      addScore('memory-flip', totalScore);
      scoreAddedRef.current = true;
    }
  }, [status, totalScore, addScore]);

  // Форматирование времени
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Вычисление размеров сетки
  const gridKey = LEVEL_GRID_KEYS[level];
  const gridSize = GRID_SIZES[gridKey];

  return (
    <GameLayout
      title="🃏 Memory Flip"
      onBack={onBack}
      footer={
        status === 'playing' ? (
          <div className="memory-flip-stats">
            <div className="stat-item">
              <span className="stat-label">Ходов:</span>
              <span className="stat-value">{moves}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Время:</span>
              <span className="stat-value">{formatTime(elapsedTime)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Уровень:</span>
              <span className="stat-value">{level}/4</span>
            </div>
          </div>
        ) : null
      }
    >
      <div className="memory-flip">
        {/* Intro Screen */}
        {status === 'intro' && (
          <div className="memory-flip-intro">
            <div className="game-icon">🃏</div>
            <h2>Memory Flip</h2>
            <p className="game-description">Тренировка кратковременной памяти</p>
            <div className="game-rules">
              <h3>Как играть:</h3>
              <ul>
                <li>Найдите все пары одинаковых эмодзи</li>
                <li>Открывайте по 2 карты за раз</li>
                <li>Запоминайте расположение карт</li>
                <li>4 уровня возрастающей сложности</li>
                <li>От 6 до 20 карт</li>
              </ul>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={startGame}
            >
              Начать игру
            </Button>
          </div>
        )}

        {/* Playing Screen */}
        {status === 'playing' && (
          <div className="memory-flip-playing">
            <div
              className="memory-grid"
              style={{
                gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
                gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
              }}
            >
              {cards.map((card, index) => (
                <button
                  key={card.id}
                  className={`memory-card ${card.isFlipped ? 'flipped' : ''} ${
                    card.isMatched ? 'matched' : ''
                  }`}
                  onClick={() => handleCardClick(index)}
                  disabled={card.isFlipped || card.isMatched}
                  aria-label={`Карта ${index + 1}`}
                >
                  <div className="card-inner">
                    <div className="card-front">?</div>
                    <div className="card-back">{card.emoji}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Level Complete Screen */}
        {status === 'level-complete' && (
          <div className="memory-flip-level-complete">
            <div className="completion-icon">🎉</div>
            <h2>Уровень {level} завершён!</h2>
            <div className="level-info">
              <p className="level-size">{LEVEL_NAMES[level]}</p>
            </div>
            <div className="level-stats">
              <div className="stat-box">
                <div className="stat-label">Ходов</div>
                <div className="stat-value">{levelStats[level - 1]?.moves || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Очки</div>
                <div className="stat-value">{levelStats[level - 1]?.score || 0}</div>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={proceedToNextLevel}
            >
              {level < 4 ? `Перейти к уровню ${level + 1}` : 'Завершить игру'}
            </Button>
          </div>
        )}

        {/* Results Screen */}
        {status === 'results' && (
          <ResultsModal
            show={true}
            title="Игра завершена!"
            score={totalScore}
            message={`Отлично! Вы прошли все ${levelStats.length} уровня!`}
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="memory-flip-results-details">
                {levelStats.map((stats, index) => (
                  <div key={index} className="results-section">
                    <h4>Уровень {index + 1} ({LEVEL_NAMES[(index + 1) as 1 | 2 | 3 | 4]})</h4>
                    <p>Ходов: {stats.moves}</p>
                    <p>Очки: {stats.score}</p>
                  </div>
                ))}
                <div className="results-section">
                  <h4>Общее время</h4>
                  <p>{formatTime(elapsedTime)}</p>
                </div>
                <div className="results-section results-total">
                  <h4>Итого очков</h4>
                  <p className="total-score">🏆 {totalScore}</p>
                </div>
              </div>
            }
          />
        )}
      </div>
    </GameLayout>
  );
}
