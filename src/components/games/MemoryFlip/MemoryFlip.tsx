import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMemoryFlip } from './useMemoryFlip';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
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
  1: '2×3 (6)',
  2: '3×4 (12)',
  3: '4×4 (16)',
  4: '4×5 (20)',
};

export default function MemoryFlip({ onBack }: MemoryFlipProps) {
  const { t } = useTranslation();
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

  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);

  // Добавляем очки в контекст при завершении игры
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      addScore('memory-flip', totalScore);
      // Calculate average time and accuracy from level stats
      const totalTime = levelStats.reduce((sum, s) => sum + s.time, 0);
      const avgTime = levelStats.length > 0 ? Math.round((totalTime / levelStats.length) * 1000) : 0;
      addGameResult({
        gameId: 'memory-flip',
        score: totalScore,
        accuracy: 100, // Completed all levels
        averageTime: avgTime,
      });
      scoreAddedRef.current = true;
    }
  }, [status, totalScore, addScore, addGameResult, levelStats]);

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
      title={`🃏 ${t('games.memory-flip.title')}`}
      onBack={onBack}
      footer={
        status === 'playing' ? (
          <div className="memory-flip-stats">
            <div className="stat-item">
              <span className="stat-label">{t('games.memory-flip.moves')}:</span>
              <span className="stat-value">{moves}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('games.memory-flip.time')}:</span>
              <span className="stat-value">{formatTime(elapsedTime)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('common.level')}:</span>
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
            <h2>{t('games.memory-flip.title')}</h2>
            <p className="game-description">{t('games.memory-flip.instructions.lead')}</p>
            <div className="game-rules">
              <h3>{t('common.howToPlay')}:</h3>
              <ul>
                <li>{t('games.memory-flip.instructions.findPairsRule')}</li>
                <li>{t('games.memory-flip.instructions.openTwoCards')}</li>
                <li>{t('games.memory-flip.instructions.rememberPositions')}</li>
                <li>{t('games.memory-flip.instructions.fourLevels')}</li>
                <li>{t('games.memory-flip.instructions.from6to20')}</li>
              </ul>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={startGame}
            >
              {t('common.startGame')}
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
                  aria-label={t('games.memory-flip.card', { number: index + 1 })}
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
            <h2>{t('games.memory-flip.levelComplete')}</h2>
            <div className="level-info">
              <p className="level-size">{t('common.level')} {level}: {LEVEL_NAMES[level]}</p>
            </div>
            <div className="level-stats">
              <div className="stat-box">
                <div className="stat-label">{t('games.memory-flip.moves')}</div>
                <div className="stat-value">{levelStats[level - 1]?.moves || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">{t('common.score')}</div>
                <div className="stat-value">{levelStats[level - 1]?.score || 0}</div>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={proceedToNextLevel}
            >
              {level < 4 ? t('games.memory-flip.goToLevel', { level: level + 1 }) : t('games.memory-flip.finishGame')}
            </Button>
          </div>
        )}

        {/* Results Screen */}
        {status === 'results' && (
          <ResultsModal
            show={true}
            title={`🎮 ${t('games.memory-flip.gameComplete')}`}
            score={totalScore}
            message={t('games.memory-flip.completedAllLevels', { count: levelStats.length })}
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="memory-flip-results-details">
                {levelStats.map((stats, index) => (
                  <div key={index} className="results-section">
                    <h4>{t('common.level')} {index + 1} ({LEVEL_NAMES[(index + 1) as 1 | 2 | 3 | 4]})</h4>
                    <p>{t('games.memory-flip.moves')}: {stats.moves}</p>
                    <p>{t('common.score')}: {stats.score}</p>
                  </div>
                ))}
                <div className="results-section">
                  <h4>{t('games.memory-flip.totalTime')}</h4>
                  <p>{formatTime(elapsedTime)}</p>
                </div>
                <div className="results-section results-total">
                  <h4>{t('games.memory-flip.totalPoints')}</h4>
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
