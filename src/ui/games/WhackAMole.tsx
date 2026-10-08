import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { WHACK, whackLayout, type WhackEvent, type WhackState } from '../../core/games/whackAMole/engine';
import { GameIntro, Lives, StatusLine, useClock } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<WhackState, WhackEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { bombChance } = whackLayout(level);
  return (
    <GameIntro
      gameId="whack-a-mole"
      level={level}
      onStart={onStart}
      rules={['whack.rule1', ...(bombChance > 0 ? ['whack.ruleBomb'] : []), 'whack.rule2', 'whack.rule3']}
    />
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { gridSize } = state.layout;
  return (
    <div className="whack">
      <div className="square-board">
        <div className="cell-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {state.holes.map((p, hole) => {
            const effect = state.last?.hole === hole && !p ? state.last.what : null;
            return (
              <button
                key={hole}
                className={`board-cell hole ${p ? p.kind : ''} ${effect ?? ''}`}
                // pointerdown: a tap registers before the finger lifts
                onPointerDown={() => dispatch({ type: 'tap', hole })}
                aria-label={t(p ? (p.kind === 'bomb' ? 'whack.bombHere' : 'whack.moleHere') : 'whack.empty')}
              >
                <span aria-hidden="true">{p ? (p.kind === 'bomb' ? '💣' : '🐹') : effect === 'bomb' ? '💥' : effect === 'hit' ? '✨' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  const now = useClock(state.phase === 'playing');
  const left = Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  return (
    <StatusLine items={[
      `${t('game.timeLeft')}: ${left} ${t('game.seconds')}`,
      <Lives left={state.lives} total={WHACK.lives} />,
      `${t('common.score')}: ${state.score}`,
      state.combo >= WHACK.comboStep && `${t('whack.combo')} ×${1 + Math.floor(state.combo / WHACK.comboStep)}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  const m = outcome.metrics;
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metricsByGame.whack-a-mole.hits')}</span><span className="stat-value">{m.hits}</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.misses')}</span><span className="stat-value">{m.misses}</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.bombHits')}</span><span className="stat-value">{m.bombHits}</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.maxCombo')}</span><span className="stat-value">{m.maxCombo}</span></div>
      {outcome.avgTimeMs > 0 && (
        <div className="stat-item"><span className="stat-label">{t('common.averageTime')}</span><span className="stat-value">{outcome.avgTimeMs} {t('common.ms')}</span></div>
      )}
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const WhackAMole: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  return <GameShell game={getGame('whack-a-mole')} views={views} onBack={onBack} onNextGame={onNextGame} />;
};
