import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../../../ui/GameShell';
import { getGame } from '../../../core/games/registry';
import {
  decoyChance, reachMs, REACTION_CLICK, type ReactionClickEvent, type ReactionClickState,
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
  const { phase } = state;
  const jumping = phase === 'clicked' || phase === 'tooEarly';
  const running = phase === 'waiting' || phase === 'decoy' || phase === 'ready';
  const ms = state.reactionTimes[state.reactionTimes.length - 1];

  let caption = t('reaction.hint');
  if (phase === 'clicked') caption = `⚡ ${ms} ${t('common.ms')}${state.combo >= 2 ? ` · ${t('reaction.streak', { count: state.combo })}` : ''}`;
  if (phase === 'tooEarly') caption = t('games.reaction-click.tooEarly');
  if (phase === 'crashed') caption = t('reaction.crash');

  return (
    <div
      className={`dino-scene ${running ? 'running' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={t('reaction.jump')}
      onPointerDown={tap}
      onKeyDown={e => (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') && (e.preventDefault(), tap())}
    >
      <p className={`dino-caption phase-${phase}`} role="status">{caption}</p>
      <span className="cloud c1" aria-hidden="true">☁️</span>
      <span className="cloud c2" aria-hidden="true">☁️</span>
      {/* keyed by attempt: each jump replays its animation */}
      <span key={`dino-${state.attempt}-${jumping}`} className={`dino ${jumping ? 'jump' : ''} ${phase === 'crashed' ? 'hurt' : ''}`} aria-hidden="true">🦖</span>
      {phase === 'ready' && (
        <span className="cactus approach" style={{ animationDuration: `${reachMs(state.level)}ms` }} aria-hidden="true">🌵</span>
      )}
      {phase === 'clicked' && <span className="cactus passed" aria-hidden="true">🌵</span>}
      {phase === 'crashed' && <span className="cactus hit" aria-hidden="true">🌵💥</span>}
      {phase === 'decoy' && <span className="bird" aria-hidden="true">🐦</span>}
      <div className="dino-ground" aria-hidden="true" />
    </div>
  );
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
  return (
    <GameShell
      game={getGame('reaction-click')}
      views={views}
      onBack={onBackToMenu}
      onNextGame={onNextGame}
    />
  );
};

export default ReactionClick;
