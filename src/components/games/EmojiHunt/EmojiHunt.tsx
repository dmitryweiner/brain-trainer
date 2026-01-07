import React, { useEffect, useRef } from 'react';
import { GameLayout, ResultsModal, ProgressBar } from '../../common';
import { useScoreContext } from '../../../context/ScoreContext';
import { GAME_IDS, ROUNDS } from '../../../utils/constants';
import useEmojiHunt from './useEmojiHunt';
import './EmojiHunt.scss';

export interface EmojiHuntProps {
  onBack: () => void;
}

export const EmojiHunt: React.FC<EmojiHuntProps> = ({ onBack }) => {
  const { addScore } = useScoreContext();
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
    if (status === 'results' && currentScore > 0 && !scoreAddedRef.current) {
      addScore(GAME_IDS.EMOJI_HUNT, currentScore);
      scoreAddedRef.current = true;
    }
    if (status === 'intro' || status === 'playing' || status === 'feedback') {
      scoreAddedRef.current = false;
    }
  }, [status, currentScore, addScore]);

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легко';
      case 'medium': return 'Средне';
      case 'hard': return 'Сложно';
      default: return '';
    }
  };

  const renderContent = () => {
    if (status === 'intro') {
      return (
        <div className="emoji-hunt-intro">
          <div className="intro-card">
            <h2>🔎 Emoji Hunt</h2>
            <div className="intro-instructions">
              <p className="lead">Тренировка визуального поиска</p>
              <div className="rules">
                <h3>Правила:</h3>
                <ul>
                  <li>Найдите целевой эмодзи на сетке</li>
                  <li>Нажмите на него как можно быстрее</li>
                  <li>С каждым раундом сложность растёт!</li>
                </ul>
              </div>
              <div className="difficulty-info">
                <h4>Уровни сложности:</h4>
                <ul>
                  <li>🟢 Раунды 1-3: <strong>3×3</strong>, разные эмодзи</li>
                  <li>🟡 Раунды 4-6: <strong>4×4</strong>, похожие смайлики</li>
                  <li>🔴 Раунды 7-10: <strong>5×5</strong>, очень похожие</li>
                </ul>
              </div>
              <div className="scoring-info">
                <p><strong>Очки:</strong> размер сетки + бонус за скорость</p>
              </div>
              <p className="text-muted">Всего раундов: {ROUNDS.EMOJI_HUNT}</p>
            </div>
            <button
              className="btn btn-primary btn-large"
              onClick={startGame}
            >
              Начать игру
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
              label={`Раунд ${currentRound + 1} / ${ROUNDS.EMOJI_HUNT}`}
            />
          </div>

          <div className="difficulty-badge">
            <span className={`badge badge-${currentDifficulty}`}>
              {getDifficultyLabel(currentDifficulty)} ({gridSize}×{gridSize})
            </span>
          </div>

          <div className="target-section">
            <span className="target-label">Найдите:</span>
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
                aria-label={`Ячейка ${index + 1}`}
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
                <div className="feedback-text">Правильно!</div>
              </>
            ) : (
              <>
                <div className="feedback-icon">✗</div>
                <div className="feedback-text">Неправильно</div>
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
            Правильных ответов: {correctAnswers} из {ROUNDS.EMOJI_HUNT}
          </p>
        </div>

        <div className="stat-item highlight">
          <span className="stat-label">🎯 Точность:</span>
          <span className="stat-value stat-best">{getAccuracy()}%</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">⏱️ Среднее время:</span>
          <span className="stat-value">{getAverageTime()}ms</span>
        </div>

        <div className="difficulty-breakdown">
          <h4>По уровням сложности:</h4>
          <div className="breakdown-item">
            <span>🟢 3×3 (1-3):</span>
            <span>{easyCorrect} / {results.filter(r => r.difficulty === 'easy').length}</span>
          </div>
          <div className="breakdown-item">
            <span>🟡 4×4 (4-6):</span>
            <span>{mediumCorrect} / {results.filter(r => r.difficulty === 'medium').length}</span>
          </div>
          <div className="breakdown-item">
            <span>🔴 5×5 (7-10):</span>
            <span>{hardCorrect} / {results.filter(r => r.difficulty === 'hard').length}</span>
          </div>
        </div>
      </div>
    );
  };

  const getMessage = () => {
    const accuracy = getAccuracy();
    
    if (accuracy === 100) {
      return '🏆 Безупречно! Вы мастер визуального поиска!';
    }
    if (accuracy >= 90) {
      return '⭐ Отлично! У вас очень зоркий глаз!';
    }
    if (accuracy >= 70) {
      return '👍 Хорошо! Продолжайте тренироваться!';
    }
    if (accuracy >= 50) {
      return '💪 Неплохо! Будьте внимательнее!';
    }
    return '🎯 Тренируйте внимание к деталям!';
  };

  return (
    <GameLayout
      title="🔎 Emoji Hunt"
      footer={
        (status === 'playing' || status === 'feedback') && (
          <div className="game-stats">
            <span>Правильно: {correctAnswers}/{currentRound}</span>
            <span>Очки: {currentScore}</span>
          </div>
        )
      }
    >
      {renderContent()}

      <ResultsModal
        show={status === 'results'}
        title="🎮 Игра завершена!"
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

