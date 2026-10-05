import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProgressBar } from '../../common';
import { GameShell, type GameViews } from '../../../ui/GameShell';
import { getGame } from '../../../core/games/registry';
import { ODD_ONE_OUT, type OddOneOutEvent, type OddOneOutState } from '../../../core/games/oddOneOut/engine';
import './OddOneOut.scss';

export interface OddOneOutProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

type Views = GameViews<OddOneOutState, OddOneOutEvent>;

const ROUNDS = ODD_ONE_OUT.rounds;

const Intro: Views['Intro'] = ({ onStart }) => {
  const { t } = useTranslation();
  return (
    <div className="odd-one-out-intro">
      <div className="intro-card">
        <h2>🔍 {t('oddOneOut.title')}</h2>
        <div className="intro-instructions">
          <p className="lead">{t('oddOneOut.description')}</p>
          <div className="rules">
            <h3>{t('common.rules')}:</h3>
            <ul>
              <li>{t('oddOneOut.instructions.look')}</li>
              <li>{t('oddOneOut.instructions.find')}</li>
              <li>{t('oddOneOut.instructions.tap')}</li>
              <li>{t('oddOneOut.instructions.difficulty')}</li>
            </ul>
          </div>
          <div className="difficulty-info">
            <h4>{t('oddOneOut.difficultyLevels')}:</h4>
            <ul>
              <li>🟢 {t('oddOneOut.rounds1to3')}: <strong>3×3</strong> ({t('common.difficulty.easy')})</li>
              <li>🟡 {t('oddOneOut.rounds4to7')}: <strong>4×4</strong> ({t('common.difficulty.medium')})</li>
              <li>🔴 {t('oddOneOut.rounds8to10')}: <strong>5×5</strong> ({t('common.difficulty.hard')})</li>
            </ul>
          </div>
          <div className="scoring-info">
            <p><strong>{t('common.score')}:</strong> {t('oddOneOut.pointsPerCorrect')}</p>
          </div>
          <p className="text-muted">{t('common.totalRounds')}: {ROUNDS}</p>
        </div>
        <button className="btn btn-primary btn-large" onClick={onStart}>
          {t('common.startGame')}
        </button>
      </div>
    </div>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();

  if (state.phase === 'feedback') {
    return (
      <div className="odd-one-out-feedback">
        <div className={`feedback-indicator ${state.lastCorrect ? 'correct' : 'incorrect'}`}>
          <div className="feedback-icon">{state.lastCorrect ? '✓' : '✗'}</div>
          <div className="feedback-text">{t(state.lastCorrect ? 'common.correct' : 'common.incorrect')}</div>
        </div>
      </div>
    );
  }
  if (state.phase !== 'playing') return null;

  const { gridSize } = state;
  return (
    <div className="odd-one-out-game">
      <div className="progress-container">
        <ProgressBar
          current={state.round}
          total={ROUNDS}
          label={`${t('common.round')} ${state.round + 1} / ${ROUNDS}`}
        />
      </div>

      <div className="difficulty-badge">
        <span className={`badge badge-${state.difficulty}`}>
          {t(`common.difficulty.${state.difficulty}`)} ({gridSize}×{gridSize})
        </span>
      </div>

      <div className="instruction-text">{t('oddOneOut.findOdd')}</div>

      <div
        className={`emoji-grid grid-${gridSize}x${gridSize}`}
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }}
      >
        {state.grid.map((emoji, index) => (
          <button
            key={index}
            className="emoji-cell"
            onClick={() => dispatch({ type: 'pick', index })}
            aria-label={t('oddOneOut.selectSymbol', { number: index + 1 })}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  const correct = state.results.filter(r => r.correct).length;
  return (
    <div className="game-stats">
      <span>{t('common.correct')}: {correct}/{state.round}</span>
      <span>{t('common.score')}: {state.score}</span>
    </div>
  );
};

const Details: Views['Details'] = ({ state, outcome }) => {
  const { t } = useTranslation();
  const { results } = state;
  const row = (difficulty: 'easy' | 'medium' | 'hard', label: string) => (
    <div className="breakdown-item">
      <span>{label}:</span>
      <span>
        {results.filter(r => r.correct && r.difficulty === difficulty).length} / {results.filter(r => r.difficulty === difficulty).length}
      </span>
    </div>
  );
  return (
    <div className="results-details">
      <div className="results-summary">
        <p className="summary-text">
          {t('common.correctAnswers')}: {outcome.metrics.correct} {t('common.of')} {ROUNDS}
        </p>
      </div>

      <div className="stat-item highlight">
        <span className="stat-label">🎯 {t('common.accuracy')}:</span>
        <span className="stat-value stat-best">{outcome.accuracy}%</span>
      </div>

      <div className="stat-item">
        <span className="stat-label">⏱️ {t('common.averageTime')}:</span>
        <span className="stat-value">{outcome.avgTimeMs}{t('common.ms')}</span>
      </div>

      <div className="difficulty-breakdown">
        <h4>{t('oddOneOut.byDifficulty')}:</h4>
        {row('easy', '🟢 3×3 (1-3)')}
        {row('medium', '🟡 4×4 (4-7)')}
        {row('hard', '🔴 5×5 (8-10)')}
      </div>
    </div>
  );
};

const views: Views = {
  Intro,
  Board,
  Footer,
  Details,
  message: ({ accuracy }, t) => {
    if (accuracy === 100) return t('oddOneOut.results.perfect');
    if (accuracy >= 90) return t('oddOneOut.results.excellent');
    if (accuracy >= 70) return t('oddOneOut.results.good');
    if (accuracy >= 50) return t('oddOneOut.results.notBad');
    return t('oddOneOut.results.keepPracticing');
  },
};

export const OddOneOut: React.FC<OddOneOutProps> = ({ onBackToMenu, onNextGame }) => {
  const { t } = useTranslation();
  return (
    <GameShell
      game={getGame('odd-one-out')}
      views={views}
      title={`🔍 ${t('oddOneOut.title')}`}
      onBack={onBackToMenu}
      onNextGame={onNextGame}
    />
  );
};

export default OddOneOut;
