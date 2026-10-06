import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { DIGIT_SPAN, digitLayout, expected, shownDigit, type DigitSpanEvent, type DigitSpanState } from '../../core/games/digitSpan/engine';
import { GameIntro, StatusLine } from './common';
import './games.scss';

type Views = GameViews<DigitSpanState, DigitSpanEvent>;

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const { startLength, backward } = digitLayout(level);
  return (
    <GameIntro
      gameId="phone-recall"
      level={level}
      onStart={onStart}
      rules={['digits.rule1', 'digits.rule2', ...(backward ? ['digits.ruleBackward'] : []), 'digits.rule3']}
    >
      <p className="intro-detail">{t('digits.layout', { length: startLength })}</p>
    </GameIntro>
  );
};

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const digit = shownDigit(state);

  useEffect(() => {
    if (state.phase !== 'input') return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) dispatch({ type: 'digit', digit: Number(e.key) });
      else if (e.key === 'Backspace') dispatch({ type: 'erase' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, dispatch]);

  const backward = state.direction === 'backward';
  const last = state.trials[state.trials.length - 1];
  return (
    <div className="digit-span">
      <p className={`direction-badge ${backward ? 'backward' : ''}`} role="status">
        {t(backward ? 'digits.backward' : 'digits.forward')}
      </p>

      {state.phase === 'showing' && (
        <div className="digit-stage" aria-live="polite">
          <span className="digit-big">{digit ?? ''}</span>
        </div>
      )}

      {(state.phase === 'input' || state.phase === 'feedback') && (
        <>
          <div className="digit-slots">
            {state.digits.map((_, i) => (
              <span key={i} className={`digit-slot ${i < state.input.length ? 'filled' : ''}`}>{state.input[i] ?? ''}</span>
            ))}
          </div>
          {state.phase === 'feedback' && (
            <p className={`digit-result ${last?.correct ? 'correct' : 'incorrect'}`} role="status">
              {last?.correct ? t('digits.correct') : t('digits.wasActually', { digits: expected(state).join(' ') })}
            </p>
          )}
          <div className="digit-keypad">
            {KEYS.map(d => (
              <button key={d} className="board-cell digit-key" disabled={state.phase !== 'input'} onClick={() => dispatch({ type: 'digit', digit: d })}>
                {d}
              </button>
            ))}
            <button className="board-cell digit-key erase" disabled={state.phase !== 'input' || state.input.length === 0} onClick={() => dispatch({ type: 'erase' })} aria-label={t('digits.erase')}>
              ⌫
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.trials.length + 1, DIGIT_SPAN.trials), total: DIGIT_SPAN.trials }),
      `${t('digits.length')}: ${state.digits.length}`,
      `${t('common.score')}: ${state.score}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  const m = outcome.metrics;
  return (
    <div className="results-details">
      <div className="stat-item highlight"><span className="stat-label">{t('metrics.maxForward')}</span><span className="stat-value">{m.maxForward}</span></div>
      {m.maxBackward !== undefined && (
        <div className="stat-item"><span className="stat-label">{t('metrics.maxBackward')}</span><span className="stat-value">{m.maxBackward}</span></div>
      )}
      <div className="stat-item"><span className="stat-label">{t('metrics.correct')}</span><span className="stat-value">{m.correct} / {m.trials}</span></div>
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const DigitSpan: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('phone-recall')} views={views} title={`📞 ${t('games.phone-recall.title')}`} onBack={onBack} />;
};
