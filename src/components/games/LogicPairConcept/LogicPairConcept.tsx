import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      title={`💡 ${t('logicPair.title')}`}
      onBack={onBack}
      footer={
        status === 'playing' ? (
          <div className="logic-pair-stats">
            <div className="stat-item">
              <span className="stat-label">{t('common.round')}:</span>
              <span className="stat-value">{currentRound} / {TOTAL_ROUNDS}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('common.correctAnswers')}:</span>
              <span className="stat-value">{correctAnswers}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('common.score')}:</span>
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
            <h2>{t('logicPair.title')}</h2>
            <p className="game-description">{t('logicPair.description')}</p>
            <div className="game-rules">
              <h3>{t('common.howToPlay')}:</h3>
              <ul>
                <li>{t('logicPair.instructions.shown')}</li>
                <li>{t('logicPair.instructions.select')}</li>
                <li>{t('logicPair.instructions.example')}</li>
                <li>{t('logicPair.instructions.rounds')}</li>
                <li>{t('logicPair.instructions.scoring')}</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              {t('common.startGame')}
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
                label={`${t('common.round')} ${currentRound} / ${TOTAL_ROUNDS}`}
              />
            </div>

            <div className="instruction">
              <p>{t('logicPair.selectPair')}</p>
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
                {t('logicPair.confirmSelection')}
              </Button>
              <p className="submit-hint">
                {selectedItems.length === 0 && t('logicPair.selectTwo')}
                {selectedItems.length === 1 && t('logicPair.selectOneMore')}
                {selectedItems.length === 2 && t('logicPair.pressConfirm')}
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
                {lastAnswerCorrect ? `${t('common.correct')} +2 ${t('common.points')}` : t('common.incorrect')}
              </div>
            </div>

            <div className="selected-items-display">
              <p className="selected-label">{t('logicPair.yourChoice')}:</p>
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
              {currentRound < TOTAL_ROUNDS ? t('logicPair.nextRound') : t('logicPair.results')}
            </Button>
          </div>
        )}

        {/* Results Screen */}
        {status === 'results' && (
          <ResultsModal
            show={true}
            title={t('common.gameOver')}
            score={score}
            message={
              accuracy >= 80
                ? t('logicPair.excellentLogic')
                : accuracy >= 60
                ? t('logicPair.goodResult')
                : t('common.tryAgain')
            }
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="logic-pair-results-details">
                <div className="results-section">
                  <h4>{t('common.accuracy')}</h4>
                  <p className="big-number">{accuracy}%</p>
                  <p className="stat-detail">
                    {correctAnswers} {t('logicPair.outOf')} {TOTAL_ROUNDS} {t('common.correct')}
                  </p>
                </div>
                <div className="results-section">
                  <h4>{t('common.correctAnswers')}</h4>
                  <p className="big-number">{correctAnswers}</p>
                </div>
                <div className="results-section">
                  <h4>{t('logicPair.incorrectAnswers')}</h4>
                  <p className="big-number">{TOTAL_ROUNDS - correctAnswers}</p>
                </div>
                <div className="results-section results-total">
                  <h4>{t('results.totalPoints')}</h4>
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
