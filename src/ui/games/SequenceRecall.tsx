import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { litPanel, SEQUENCE, sequenceLayout, sequenceLevelStep, type SequenceEvent, type SequenceState } from '../../core/games/sequenceRecall/engine';
import { Confetti } from '../Confetti';
import { useServices } from '../services';
import { GameIntro, Lives, StatusLine } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<SequenceState, SequenceEvent>;

/** How long a pressed panel glows and sounds */
const PRESS_MS = 400;

/** Panel colours (distinct also in grayscale by position) and their tones: a pentatonic-ish scale */
const PANELS = [
  { color: '#e53935', freq: 330 }, { color: '#1e88e5', freq: 392 }, { color: '#fdd835', freq: 440 },
  { color: '#43a047', freq: 523 }, { color: '#8e24aa', freq: 587 }, { color: '#fb8c00', freq: 659 },
  { color: '#00acc1', freq: 784 }, { color: '#6d4c41', freq: 880 }, { color: '#ec407a', freq: 988 },
];

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const { panels, length } = sequenceLayout(level);
  return (
    <GameIntro gameId="sequence-recall" level={level} onStart={onStart} rules={['repeat.rule1', 'repeat.rule2', 'repeat.rule3']}>
      <p className="intro-detail">{t('repeat.layout', { panels, length })}</p>
    </GameIntro>
  );
};

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { audio, prefs, scheduler } = useServices();
  const tone = (freq: number, ms: number) => prefs.get().sound && audio?.tone(freq, ms);
  // the panel the player just pressed lights up like a shown one
  const [pressed, setPressed] = useState<number | null>(null);
  const pressTimer = useRef<unknown>(null);
  useEffect(() => () => {
    if (pressTimer.current !== null) scheduler.clearTimeout(pressTimer.current);
  }, [scheduler]);
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
      : t(state.lastCorrect ? 'repeat.win' : state.lives > 0 ? 'repeat.tryAgain' : 'repeat.lost');

  return (
    <div className="repeat">
      <p className="game-prompt" role="status">{prompt}</p>
      <div className="square-board">
        <div className="cell-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {PANELS.slice(0, panels).map((p, i) => (
            <button
              key={i}
              className={`board-cell repeat-panel ${lit === i || pressed === i ? 'lit' : ''}`}
              style={{ ['--panel' as string]: p.color }}
              disabled={state.phase !== 'input'}
              aria-label={t('repeat.panel', { n: i + 1 })}
              onPointerDown={() => {
                if (state.phase !== 'input') return;
                tone(p.freq, PRESS_MS + 50);
                setPressed(i);
                if (pressTimer.current !== null) scheduler.clearTimeout(pressTimer.current);
                pressTimer.current = scheduler.setTimeout(() => setPressed(null), PRESS_MS);
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
      `${t('repeat.length')}: ${state.layout.length}`,
      <Lives left={state.lives} total={SEQUENCE.lives} />,
    ]} />
  );
};

const Details: Views['Details'] = ({ state, outcome }) => {
  const { t } = useTranslation();
  const next = sequenceLayout(state.level + (sequenceLevelStep(outcome) ?? 0)).length;
  return (
    <div className="results-details">
      {state.won && <Confetti />}
      <div className="stat-item highlight"><span className="stat-label">{t('repeat.length')}</span><span className="stat-value">{state.layout.length}</span></div>
      <div className="stat-item"><span className="stat-label">{t('repeat.nextLength')}</span><span className="stat-value">{next}</span></div>
    </div>
  );
};

/** Win or loss is the verdict: the rating band would call a short win "could be better" */
const message: Views['message'] = (outcome, t) => t(outcome.metrics.won ? 'repeat.verdictWin' : 'repeat.verdictLost');

const views: Views = { Intro, Board, Footer, Details, message };

export const SequenceRecall: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  return <GameShell game={getGame('sequence-recall')} views={views} onBack={onBack} onNextGame={onNextGame} />;
};
