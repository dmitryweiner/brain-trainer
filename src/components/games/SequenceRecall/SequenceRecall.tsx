import { useTranslation } from 'react-i18next';
import { useRecordResult } from '../../../hooks/useRecordResult';
import { useSequenceRecall } from './useSequenceRecall';
import GameLayout from '../../common/GameLayout';
import Button from '../../common/Button';
import ResultsModal from '../../common/ResultsModal';
import ProgressBar from '../../common/ProgressBar';
import './SequenceRecall.scss';

interface SequenceRecallProps {
  onBack: () => void;
}

const MAX_LENGTH = 6;
const INITIAL_LENGTH = 3;

export default function SequenceRecall({ onBack }: SequenceRecallProps) {
  const { t } = useTranslation();
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
  const session = useRecordResult(status === 'results', () => {
    // Accuracy based on correct sequences vs possible sequences
    const maxPossible = MAX_LENGTH - INITIAL_LENGTH + 1;
    return {
      gameId: 'sequence-recall',
      score: totalScore,
      accuracy: Math.min(Math.round((correctSequences / maxPossible) * 100), 100),
      averageTime: 0, // No time tracking in this game
    };
  });

  return (
    <GameLayout
      title={`🧠 ${t('sequenceRecall.title')}`}
      footer={
        status === 'input' ? (
          <div className="sequence-recall-stats">
            <div className="stat-item">
              <span className="stat-label">{t('common.length')}:</span>
              <span className="stat-value">{currentLength}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('common.entered')}:</span>
              <span className="stat-value">{userSequence.length} / {sequence.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('common.score')}:</span>
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
            <h2>{t('sequenceRecall.title')}</h2>
            <p className="game-description">{t('sequenceRecall.description')}</p>
            <div className="game-rules">
              <h3>{t('common.howToPlay')}:</h3>
              <ul>
                <li>{t('sequenceRecall.instructions.memorize')}</li>
                <li>{t('sequenceRecall.instructions.reproduce')}</li>
                <li>{t('sequenceRecall.instructions.initialLength')}</li>
                <li>{t('sequenceRecall.instructions.onSuccess')}</li>
                <li>{t('sequenceRecall.instructions.onError')}</li>
                <li>{t('sequenceRecall.instructions.scoring')}</li>
              </ul>
            </div>
            <Button variant="primary" size="large" onClick={startGame}>
              {t('common.startGame')}
            </Button>
          </div>
        )}

        {/* Showing Screen */}
        {status === 'showing' && (
          <div className="sequence-recall-showing">
            <div className="sequence-info">
              <h3>{t('sequenceRecall.memorizeSequence')}</h3>
              <ProgressBar
                current={userSequence.length + 1}
                total={MAX_LENGTH}
                label={`${t('common.level')} ${currentLength}`}
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
              {t('sequenceRecall.emoji')} {userSequence.length + 1} {t('sequenceRecall.of')} {sequence.length}
            </div>
          </div>
        )}

        {/* Input Screen */}
        {status === 'input' && (
          <div className="sequence-recall-input">
            <div className="sequence-info">
              <h3>{t('sequenceRecall.repeatSequence')}</h3>
              <ProgressBar
                current={currentLength}
                total={MAX_LENGTH}
                label={`${t('common.level')} ${currentLength}`}
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
                  ? `${t('common.correct')} +${currentLength} ${t('common.points')}`
                  : t('common.incorrect')}
              </div>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {status === 'results' && (
          <ResultsModal
            session={session}
            show={true}
            title={lastAnswerCorrect ? t('results.maxReached') : t('common.gameOver')}
            score={totalScore}
            message={
              lastAnswerCorrect
                ? `${t('common.congratulations')} ${MAX_LENGTH}!`
                : t('common.tryAgain')
            }
            onPlayAgain={startGame}
            onBackToMenu={onBack}
            details={
              <div className="sequence-recall-results-details">
                <div className="results-section">
                  <h4>{t('results.correctSequences')}</h4>
                  <p className="big-number">{correctSequences}</p>
                </div>
                <div className="results-section">
                  <h4>{t('results.maxLength')}</h4>
                  <p className="big-number">{lastAnswerCorrect ? MAX_LENGTH : currentLength - 1}</p>
                </div>
                <div className="results-section">
                  <h4>{t('results.totalPoints')}</h4>
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
