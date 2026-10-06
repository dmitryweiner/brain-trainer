import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { litPanel, SEQUENCE, sequenceLayout, type SequenceEvent, type SequenceState } from '../../core/games/sequenceRecall/engine';
import { useServices } from '../services';
import { GameIntro, Lives, StatusLine } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<SequenceState, SequenceEvent>;

/** Panel colours (distinct also in grayscale by position) and their tones: a pentatonic-ish scale */
const PANELS = [
  { color: '#e53935', freq: 330 }, { color: '#1e88e5', freq: 392 }, { color: '#fdd835', freq: 440 },
  { color: '#43a047', freq: 523 }, { color: '#8e24aa', freq: 587 }, { color: '#fb8c00', freq: 659 },
  { color: '#00acc1', freq: 784 }, { color: '#6d4c41', freq: 880 }, { color: '#ec407a', freq: 988 },
];

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const { panels, startLength } = sequenceLayout(level);
  return (
    <GameIntro gameId="sequence-recall" level={level} onStart={onStart} rules={['repeat.rule1', 'repeat.rule2', 'repeat.rule3']}>
      <p className="intro-detail">{t('repeat.layout', { panels, length: startLength })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { audio, prefs } = useServices();
  const tone = (freq: number, ms: number) => prefs.get().sound && audio?.tone(freq, ms);
  const lit = litPanel(state);
  const { panels, showMs } = state.layout;
  const cols = panels === 4 ? 2 : 3;

  // the panel being shown sounds once per flash
  const lastStep = useRef(-1);
  useEffect(() => {
    if (lit !== null && lastStep.current !== state.step && prefs.get().sound) audio?.tone(PANELS[lit].freq, showMs * 0.9);
    lastStep.current = state.step;
  }, [lit, state.step, showMs, audio, prefs]);

  const prompt = state.phase === 'showing'
    ? t('repeat.watch')
    : state.phase === 'input'
      ? t('repeat.yourTurn', { done: state.inputIndex, total: state.sequence.length })
      : t(state.lastCorrect ? 'repeat.correct' : 'repeat.wrong');

  return (
    <div className="repeat">
      <p className="game-prompt" role="status">{prompt}</p>
      <div className="square-board">
        <div className="cell-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {PANELS.slice(0, panels).map((p, i) => (
            <button
              key={i}
              className={`board-cell repeat-panel ${lit === i ? 'lit' : ''}`}
              style={{ ['--panel' as string]: p.color }}
              disabled={state.phase !== 'input'}
              aria-label={t('repeat.panel', { n: i + 1 })}
              onPointerDown={() => {
                if (state.phase !== 'input') return;
                tone(p.freq, 220);
                dispatch({ type: 'tap', panel: i });
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      `${t('repeat.length')}: ${state.sequence.length}`,
      <Lives left={state.lives} total={SEQUENCE.lives} />,
      `${t('common.score')}: ${state.score}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item highlight"><span className="stat-label">{t('metrics.maxSequence')}</span><span className="stat-value">{outcome.metrics.maxSequence}</span></div>
      <div className="stat-item"><span className="stat-label">{t('metrics.rounds')}</span><span className="stat-value">{outcome.metrics.rounds}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const SequenceRecall: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('sequence-recall')} views={views} title={`🎹 ${t('games.sequence-recall.title')}`} onBack={onBack} onNextGame={onNextGame} />;
};
