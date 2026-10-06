import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { FLAGS, optionCount, type FlagsEvent, type FlagsState } from '../../core/games/flags/engine';
import { GameIntro, StatusLine } from './common';
import './games.scss';

type Views = GameViews<FlagsState, FlagsEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  return (
    <GameIntro
      gameId="flags-game"
      level={level}
      onStart={onStart}
      rules={['flags.rule1', 'flags.rule2']}
      actions={(
        <div className="intro-modes">
          <button className="btn-custom btn-primary btn-large btn-full" onClick={() => onStart('flag-to-country')}>🏳️ → 🌍 {t('flags.modeFlagToCountry')}</button>
          <button className="btn-custom btn-secondary btn-large btn-full" onClick={() => onStart('country-to-flag')}>🌍 → 🏳️ {t('flags.modeCountryToFlag')}</button>
        </div>
      )}
    >
      <p className="intro-detail">{t('flags.layout', { options: optionCount(level) })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const name = (code: string) => t(`countries.${code}`);
  const reverse = state.mode === 'country-to-flag';
  return (
    <div className="flags">
      <div className="flags-question">
        {reverse
          ? <p className="flags-country">{name(state.answer.code)}</p>
          : <span className="flags-flag" role="img" aria-label={t('flags.whichCountry')}>{state.answer.emoji}</span>}
        <p className="game-prompt">{t(reverse ? 'flags.whichFlag' : 'flags.whichCountry')}</p>
      </div>
      <div className={`flags-options ${reverse ? 'as-flags' : ''}`}>
        {state.options.map(o => {
          const mark = state.phase === 'feedback'
            ? o.code === state.answer.code ? 'right' : o.code === state.picked ? 'wrong' : ''
            : '';
          return (
            <button
              key={o.code}
              className={`board-cell flags-option ${mark}`}
              disabled={state.phase !== 'playing'}
              onClick={() => dispatch({ type: 'pick', code: o.code })}
              aria-label={reverse ? name(o.code) : undefined}
            >
              {reverse ? <span aria-hidden="true">{o.emoji}</span> : name(o.code)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.round + 1, FLAGS.rounds), total: FLAGS.rounds }),
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

export const Flags: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('flags-game')} views={views} title={`🏳️ ${t('games.flags-game.title')}`} onBack={onBack} />;
};
