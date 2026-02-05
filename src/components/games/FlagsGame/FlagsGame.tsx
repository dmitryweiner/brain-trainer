import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFlagsGame, type GameMode } from './useFlagsGame';
import { useScoreContext } from '../../../context/ScoreContext';
import { useGameHistoryContext } from '../../../context/GameHistoryContext';
import GameLayout from '../../common/GameLayout';
import Button from '../../common/Button';
import ResultsModal from '../../common/ResultsModal';
import ProgressBar from '../../common/ProgressBar';
import './FlagsGame.scss';

interface FlagsGameProps {
  onBack: () => void;
}

export default function FlagsGame({ onBack }: FlagsGameProps) {
  const { t } = useTranslation();
  const {
    status,
    mode,
    currentRound,
    totalRounds,
    correctCountry,
    options,
    lastAnswerCorrect,
    roundResults,
    totalScore,
    correctAnswers,
    averageTime,
    selectMode,
    handleAnswer,
    startGame,
    resetGame,
  } = useFlagsGame();

  const { addScore } = useScoreContext();
  const { addGameResult } = useGameHistoryContext();
  const scoreAddedRef = useRef(false);

  // Reset score tracking when game resets
  useEffect(() => {
    if (status === 'intro' || status === 'mode-select') {
      scoreAddedRef.current = false;
    }
  }, [status]);

  // Add score when game ends
  useEffect(() => {
    if (status === 'results' && !scoreAddedRef.current) {
      addScore('flags-game', totalScore);
      const accuracy = Math.round((correctAnswers / totalRounds) * 100);
      addGameResult({
        gameId: 'flags-game',
        score: totalScore,
        accuracy,
        averageTime,
      });
      scoreAddedRef.current = true;
    }
  }, [status, totalScore, correctAnswers, totalRounds, averageTime, addScore, addGameResult]);

  const getCountryName = (code: string) => {
    return t(`countries.${code}`, { defaultValue: code });
  };

  const handleModeSelect = (selectedMode: GameMode) => {
    selectMode(selectedMode);
  };

  const handlePlayAgain = () => {
    resetGame();
    startGame();
  };

  return (
    <GameLayout
      title={`🏳️ ${t('flagsGame.title')}`}
      onBack={onBack}
      footer={
        (status === 'playing' || status === 'feedback') ? (
          <div className="flags-game-stats">
            <div className="stat-item">
              <span className="stat-label">{t('common.round')}:</span>
              <span className="stat-value">{currentRound}/{totalRounds}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">{t('common.score')}:</span>
              <span className="stat-value">{totalScore}</span>
            </div>
          </div>
        ) : null
      }
    >
      <div className="flags-game">
        {/* Intro Screen */}
        {status === 'intro' && (
          <div className="flags-game-intro">
            <div className="game-icon">🏳️</div>
            <h2>{t('flagsGame.title')}</h2>
            <p className="game-description">{t('flagsGame.description')}</p>
            <div className="game-rules">
              <h3>{t('common.howToPlay')}:</h3>
              <ul>
                <li>{t('flagsGame.instructions.modes')}</li>
                <li>{t('flagsGame.instructions.rounds', { count: totalRounds })}</li>
                <li>{t('flagsGame.instructions.speed')}</li>
                <li>{t('flagsGame.instructions.scoring')}</li>
              </ul>
            </div>
            <Button variant="primary" size="lg" onClick={startGame}>
              {t('common.startGame')}
            </Button>
          </div>
        )}

        {/* Mode Selection Screen */}
        {status === 'mode-select' && (
          <div className="flags-game-mode-select">
            <h2>{t('flagsGame.selectMode')}</h2>
            <div className="mode-options">
              <button
                className="mode-button"
                onClick={() => handleModeSelect('flag-to-country')}
              >
                <div className="mode-icon">🏳️ → 🌍</div>
                <div className="mode-title">{t('flagsGame.modes.flagToCountry')}</div>
                <div className="mode-description">{t('flagsGame.modes.flagToCountryDesc')}</div>
              </button>
              <button
                className="mode-button"
                onClick={() => handleModeSelect('country-to-flag')}
              >
                <div className="mode-icon">🌍 → 🏳️</div>
                <div className="mode-title">{t('flagsGame.modes.countryToFlag')}</div>
                <div className="mode-description">{t('flagsGame.modes.countryToFlagDesc')}</div>
              </button>
            </div>
          </div>
        )}

        {/* Playing Screen */}
        {(status === 'playing' || status === 'feedback') && correctCountry && (
          <div className="flags-game-playing">
            <ProgressBar
              current={currentRound}
              total={totalRounds}
              label={`${t('common.round')} ${currentRound}`}
            />

            <div className="question-area">
              {mode === 'flag-to-country' ? (
                <>
                  <div className="flag-display">
                    <span className="flag-emoji">{correctCountry.emoji}</span>
                  </div>
                  <p className="question-text">{t('flagsGame.whichCountry')}</p>
                </>
              ) : (
                <>
                  <p className="country-name-display">
                    {getCountryName(correctCountry.code)}
                  </p>
                  <p className="question-text">{t('flagsGame.whichFlag')}</p>
                </>
              )}
            </div>

            <div className="options-grid">
              {options.map((option) => {
                const isCorrect = option.code === correctCountry.code;
                const showFeedback = status === 'feedback';
                
                return (
                  <button
                    key={option.code}
                    className={`option-button ${
                      showFeedback && isCorrect ? 'correct' : ''
                    } ${
                      showFeedback && !isCorrect && lastAnswerCorrect === false ? 'incorrect' : ''
                    }`}
                    onClick={() => handleAnswer(option.code)}
                    disabled={status === 'feedback'}
                  >
                    {mode === 'flag-to-country' ? (
                      <span className="option-text">{getCountryName(option.code)}</span>
                    ) : (
                      <span className="option-flag">{option.emoji}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={`feedback-message ${status === 'feedback' ? (lastAnswerCorrect ? 'correct' : 'incorrect') : 'hidden'}`}>
              {status === 'feedback' && (
                lastAnswerCorrect 
                  ? `${t('common.correct')} +${roundResults[roundResults.length - 1]?.points || 0}`
                  : t('common.incorrect')
              )}
              {status !== 'feedback' && '\u00A0'} {/* Non-breaking space to maintain height */}
            </div>
          </div>
        )}

        {/* Results Screen */}
        {status === 'results' && (
          <ResultsModal
            show={true}
            title={t('common.gameOver')}
            score={totalScore}
            message={
              correctAnswers === totalRounds
                ? t('flagsGame.results.perfect')
                : correctAnswers >= totalRounds * 0.8
                ? t('flagsGame.results.excellent')
                : correctAnswers >= totalRounds * 0.6
                ? t('flagsGame.results.good')
                : t('flagsGame.results.keepPracticing')
            }
            onPlayAgain={handlePlayAgain}
            onBackToMenu={onBack}
            details={
              <div className="flags-game-results-details">
                <div className="results-section">
                  <h4>{t('common.correctAnswers')}</h4>
                  <p className="big-number">{correctAnswers}/{totalRounds}</p>
                </div>
                <div className="results-section">
                  <h4>{t('common.averageTime')}</h4>
                  <p className="big-number">{(averageTime / 1000).toFixed(1)}s</p>
                </div>
                <div className="results-section">
                  <h4>{t('common.accuracy')}</h4>
                  <p className="big-number">{Math.round((correctAnswers / totalRounds) * 100)}%</p>
                </div>
              </div>
            }
          />
        )}
      </div>
    </GameLayout>
  );
}
