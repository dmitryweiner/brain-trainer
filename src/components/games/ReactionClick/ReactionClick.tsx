import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../../../ui/GameShell';
import { getGame } from '../../../core/games/registry';
import {
  decoyChance, REACTION_CLICK, type ReactionClickEvent, type ReactionClickState,
} from '../../../core/games/reactionClick/engine';
import { activeSessions, gameStats } from '../../../core/stats';
import { useEvents, useServices } from '../../../ui/services';
import { GameIntro, Lives, StatusLine } from '../../../ui/games/common';
import { HorizontalBars } from '../../../ui/charts/charts';
import './ReactionClick.scss';

export interface ReactionClickProps {
  onBackToMenu: () => void;
  onNextGame?: () => void;
}

type Views = GameViews<ReactionClickState, ReactionClickEvent>;
const TOTAL = REACTION_CLICK.attempts;

const Intro: Views['Intro'] = ({ onStart, level }) => (
  <GameIntro
    gameId="reaction-click"
    level={level}
    onStart={onStart}
    rules={[
      'reaction.rule1', 'reaction.rule2', ...(decoyChance(level) > 0 ? ['reaction.ruleDecoy'] : []), 'reaction.rule3',
    ]}
  />
);

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const tap = () => dispatch({ type: 'tap' });
  const tappable = {
    onPointerDown: tap,
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && tap(),
  };

  switch (state.phase) {
    case 'waiting':
      return (
        <div className="reaction-area reaction-waiting" {...tappable}>
          <div className="reaction-content">
            <div className="reaction-emoji">⏳</div>
            <h2>{t('games.reaction-click.waiting')}</h2>
            <p className="attempt-counter">{t('games.reaction-click.attempt')} {state.attempt + 1} / {TOTAL}</p>
          </div>
        </div>
      );
    case 'decoy':
      // looks like a signal on purpose: only green means "go"
      return (
        <div className="reaction-area reaction-decoy" {...tappable}>
          <div className="reaction-content">
            <div className="reaction-emoji">🟡</div>
          </div>
        </div>
      );
    case 'ready':
      return (
        <div className="reaction-area reaction-ready" {...tappable}>
          <div className="reaction-content">
            <div className="reaction-emoji">🟢</div>
            <h2>{t('games.reaction-click.clickNow')}</h2>
          </div>
        </div>
      );
    case 'clicked': {
      const ms = state.reactionTimes[state.reactionTimes.length - 1];
      return (
        <div className="reaction-area reaction-clicked">
          <div className="reaction-content">
            <div className="reaction-emoji celebration">⚡</div>
            <h2>{ms} {t('common.ms')}</h2>
            {state.combo >= 2 && <p>{t('reaction.streak', { count: state.combo })}</p>}
          </div>
        </div>
      );
    }
    case 'tooEarly':
      return (
        <div className="reaction-area reaction-too-early">
          <div className="reaction-content">
            <div className="reaction-emoji explosion">💥</div>
            <h2>{t('games.reaction-click.tooEarly')}</h2>
            <p>{t('reaction.onlyGreen')}</p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      `${t('games.reaction-click.attempt')}: ${Math.min(state.attempt + 1, TOTAL)}/${TOTAL}`,
      <Lives left={state.lives} total={REACTION_CLICK.lives} />,
      `${t('common.score')}: ${state.score}`,
    ]} />
  );
};

/** Reaction time bands for the distribution */
const BANDS: [number, number][] = [[0, 250], [250, 350], [350, 500], [500, 800], [800, Infinity]];

const Details: Views['Details'] = ({ state, outcome }) => {
  const { t } = useTranslation();
  const { repository } = useServices();
  const events = useEvents(repository);
  const bestEver = useMemo(
    () => gameStats(activeSessions(events), 'reaction-click').bestMetrics.bestReactionMs,
    [events],
  );
  const times = state.reactionTimes;
  if (times.length === 0) {
    return <div className="results-details"><p className="text-muted">{t('games.reaction-click.noSuccessfulAttempts')}</p></div>;
  }
  const rows = BANDS.map(([lo, hi]) => ({
    key: `${lo}`,
    label: hi === Infinity ? `≥ ${lo} ${t('common.ms')}` : `${lo}–${hi} ${t('common.ms')}`,
    value: times.filter(ms => ms >= lo && ms < hi).length,
  }));
  return (
    <div className="results-details">
      <div className="stat-item highlight"><span className="stat-label">⚡ {t('games.reaction-click.bestReaction')}</span><span className="stat-value">{outcome.metrics.bestReactionMs} {t('common.ms')}</span></div>
      <div className="stat-item"><span className="stat-label">📊 {t('games.reaction-click.averageReaction')}</span><span className="stat-value">{outcome.avgTimeMs} {t('common.ms')}</span></div>
      {bestEver !== undefined && (
        <div className="stat-item"><span className="stat-label">🏆 {t('reaction.bestEver')}</span><span className="stat-value">{bestEver} {t('common.ms')}</span></div>
      )}
      <div className="stat-item"><span className="stat-label">{t('metrics.falseStarts')}</span><span className="stat-value">{state.falseStarts}</span></div>
      <h4 className="details-heading">{t('reaction.distribution')}</h4>
      <HorizontalBars rows={rows} max={Math.max(1, ...rows.map(r => r.value))} />
    </div>
  );
};

const views: Views = {
  Intro,
  Board,
  Footer,
  Details,
  message: (outcome, t) => {
    if (outcome.metrics.hits === 0) return t('games.reaction-click.results.tryAgain');
    if (outcome.metrics.bestReactionMs < 250) return t('games.reaction-click.results.incredible');
    if (outcome.avgTimeMs < 300) return t('games.reaction-click.results.excellent');
    if (outcome.avgTimeMs < 500) return t('games.reaction-click.results.good');
    if (outcome.avgTimeMs < 700) return t('games.reaction-click.results.notBad');
    return t('games.reaction-click.results.keepPracticing');
  },
};

export const ReactionClick: React.FC<ReactionClickProps> = ({ onBackToMenu, onNextGame }) => {
  const { t } = useTranslation();
  return (
    <GameShell
      game={getGame('reaction-click')}
      views={views}
      title={`⚡ ${t('games.reaction-click.title')}`}
      onBack={onBackToMenu}
      onNextGame={onNextGame}
    />
  );
};

export default ReactionClick;
