import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      title={`🔄 ${t('nBack.title')}`}
      onBack={onBack}
      footer={
        status === 'playing' ? (
          <div className="n-back-stats">
            <div className="stat-item">
              <span className="stat-label">{t('nBack.block')}:</span>
              <span className="stat-value">{currentBlock} / {TOTAL_BLOCKS}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('nBack.position')}:</span>
              <span className="stat-value">{currentIndex + 1} / {ITEMS_PER_BLOCK}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('nBack.hits')}:</span>
              <span className="stat-value">{hits}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('nBack.misses')}:</span>
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
            <h2>{t('nBack.title')}</h2>
            <p className="game-description">{t('nBack.description')}</p>
            <div className="game-rules">
              <h3>{t('common.howToPlay')}:</h3>
              <ul>
                <li>{t('nBack.instructions.appear')}</li>
                <li>{t('nBack.instructions.match')}</li>
                <li>{t('nBack.instructions.noMatch')}</li>
                <li>{t('nBack.instructions.blocks')}</li>
                <li>{t('nBack.instructions.hitScore')}</li>
                <li>{t('nBack.instructions.rejectScore')}</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              {t('common.startGame')}
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
                label={`${t('nBack.block')} ${currentBlock} / ${TOTAL_BLOCKS}`}
              />
            </div>

            {/* История */}
            <div className="history-section">
              <div className="history-label">{t('nBack.history')}:</div>
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
                ✓ {t('nBack.match')}
              </Button>
              <p className="answer-hint">
                {currentIndex < 2
                  ? t('nBack.memorize')
                  : t('nBack.pressIfMatch')}
              </p>
            </div>
          </div>
        )}

        {/* Block Pause Screen */}
        {status === 'blockPause' && (
          <div className="n-back-block-pause">
            <div className="pause-message">
              <h3>{t('nBack.block')} {currentBlock - 1} {t('nBack.blockComplete')}</h3>
              <p>{t('nBack.prepareForBlock')} {currentBlock}...</p>
              <div className="pause-stats">
                <div className="stat">
                  <span className="stat-label">{t('nBack.hits')}:</span>
                  <span className="stat-value">{hits}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t('nBack.misses')}:</span>
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
            title={t('common.gameOver')}
            score={Math.round(score)}
            message={
              accuracy >= 80
                ? t('nBack.excellentMemory')
                : accuracy >= 60
                ? t('logicPair.goodResult')
                : t('common.tryAgain')
            }
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="n-back-results-details">
                <div className="results-section">
                  <h4>{t('common.accuracy')}</h4>
                  <p className="big-number">{accuracy}%</p>
                </div>
                <div className="results-section">
                  <h4>{t('nBack.hits')}</h4>
                  <p className="big-number">{hits}</p>
                  <p className="stat-detail">+{hits} {t('common.points')}</p>
                </div>
                <div className="results-section">
                  <h4>{t('nBack.correctRejections')}</h4>
                  <p className="big-number">{correctRejections}</p>
                  <p className="stat-detail">+{(correctRejections * 0.5).toFixed(1)} {t('common.points')}</p>
                </div>
                <div className="results-section">
                  <h4>{t('nBack.missedMatches')}</h4>
                  <p className="big-number">{misses}</p>
                </div>
                <div className="results-section">
                  <h4>{t('nBack.falseAlarms')}</h4>
                  <p className="big-number">{falseAlarms}</p>
                </div>
                <div className="results-section results-total">
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
