import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { MIRROR, type MirrorEvent, type MirrorState } from '../../core/games/mirror/engine';
import { cellsFor } from '../../core/games/rotateShape/engine';
import { GameIntro, StatusLine } from './common';
import { ShapeChoice } from './ShapeChoice';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<MirrorState, MirrorEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  return (
    <GameIntro gameId="mirror" level={level} onStart={onStart} rules={['mirror.rule1', 'mirror.rule2any', 'mirror.rule3']}>
      <p className="intro-detail">{t('rotate.layout', { cells: cellsFor(level) })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  return (
    <ShapeChoice
      prompt={t('mirror.prompt')}
      target={state.current.target}
      options={state.current.options}
      answer={state.current.answer}
      picked={state.picked}
      feedback={state.phase === 'feedback'}
      disabled={state.phase !== 'playing'}
      onPick={index => dispatch({ type: 'pick', index })}
      mirrorSide={state.current.side}
    />
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.round + 1, MIRROR.rounds), total: MIRROR.rounds }),
      `${t('metrics.correct')}: ${state.answers.filter(a => a.correct).length}/${state.answers.length}`,
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

export const Mirror: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  return <GameShell game={getGame('mirror')} views={views} onBack={onBack} onNextGame={onNextGame} />;
};
