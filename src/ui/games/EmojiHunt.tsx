import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { EMOJI_HUNT, huntRound, type EmojiHuntEvent, type EmojiHuntState } from '../../core/games/emojiHunt/engine';
import { FeedbackMark, GameIntro, StatusLine } from './common';
import './games.scss';

type Views = GameViews<EmojiHuntState, EmojiHuntEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  return (
    <GameIntro gameId="emoji-hunt" level={level} onStart={onStart} rules={['hunt.rule1', 'hunt.rule2', 'hunt.rule3']}>
      <p className="intro-detail">{t('hunt.layout', { from: huntRound(level, 0).size, to: huntRound(level, EMOJI_HUNT.rounds - 1).size })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  return (
    <div className="emoji-hunt">
      <p className="game-prompt">
        {t('hunt.find')} <span className="hunt-target">{state.target}</span>
      </p>
      <div className="square-board">
        <div className="cell-grid tight" style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}>
          {state.grid.map((emoji, i) => (
            <button
              key={i}
              className={`board-cell emoji-cell-v2 ${state.phase === 'feedback' && i === state.targetIndex ? 'hit' : ''}`}
              style={{ fontSize: `min(${Math.round(56 / state.size)}vw, ${Math.round(320 / state.size)}px)` }}
              disabled={state.phase !== 'playing'}
              onClick={() => dispatch({ type: 'pick', index: i })}
            >
              {emoji}
            </button>
          ))}
        </div>
        {state.phase === 'feedback' && <FeedbackMark correct={state.lastCorrect} />}
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.round + 1, EMOJI_HUNT.rounds), total: EMOJI_HUNT.rounds }),
      `${state.size}×${state.size}`,
      `${t('common.score')}: ${state.score}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metrics.correct')}</span><span className="stat-value">{outcome.metrics.correct} / {outcome.metrics.rounds}</span></div>
      <div className="stat-item"><span className="stat-label">{t('common.averageTime')}</span><span className="stat-value">{(outcome.avgTimeMs / 1000).toFixed(1)} {t('game.seconds')}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const EmojiHunt: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('emoji-hunt')} views={views} title={`🔎 ${t('games.emoji-hunt.title')}`} onBack={onBack} />;
};
