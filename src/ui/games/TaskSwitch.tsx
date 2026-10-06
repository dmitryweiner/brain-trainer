import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import { SWITCH, switchLayout, type Rule, type Side, type SwitchEvent, type SwitchState } from '../../core/games/taskSwitch/engine';
import { FeedbackMark, GameIntro, Lives, StatusLine } from './common';
import './games.scss';

type Views = GameViews<SwitchState, SwitchEvent>;

const HUE = { green: '#2e7d32', red: '#c62828' } as const;
const RULE_ICON: Record<Rule, string> = { shape: '⬛⚪', color: '🟩🟥', ink: '🖋️' };

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { rules, warn } = switchLayout(level);
  return (
    <GameIntro
      gameId="dual-rule-reaction"
      level={level}
      onStart={onStart}
      rules={[
        'switch.ruleShape', 'switch.ruleColor', ...(rules.includes('ink') ? ['switch.ruleInk'] : []),
        warn ? 'switch.ruleWarned' : 'switch.ruleUnwarned', 'switch.ruleTime',
      ]}
    />
  );
};

/** Button labels: what left and right mean under the rule */
function labels(rule: Rule): [string, string] {
  return rule === 'shape' ? ['switch.circle', 'switch.square'] : ['switch.green', 'switch.red'];
}

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { rule, stimulus, layout } = state;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') dispatch({ type: 'answer', side: 'left' });
      if (e.key === 'ArrowRight') dispatch({ type: 'answer', side: 'right' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const [left, right] = labels(rule);
  const answer = (side: Side) => dispatch({ type: 'answer', side });
  return (
    <div className="task-switch">
      <div className={`rule-cue rule-${rule}`} role="status">
        <span aria-hidden="true">{RULE_ICON[rule]}</span>
        {/* without warnings the rule is only shown by its icon */}
        <span className={layout.warn ? '' : 'sr-only'}>{t(`switch.rule.${rule}`)}</span>
      </div>

      <div className="switch-stage">
        {state.phase === 'cue' && <p className="switch-warning">⚠️ {t('switch.changing')}</p>}
        {(state.phase === 'stimulus' || state.phase === 'feedback') && (
          stimulus.kind === 'word'
            ? <span className="stroop-word" style={{ color: HUE[stimulus.color] }}>{t(`switch.word.${stimulus.word}`)}</span>
            : (
              <svg className="switch-figure" viewBox="0 0 100 100" role="img" aria-label={t(`switch.figure.${stimulus.shape}.${stimulus.color}`)}>
                {stimulus.shape === 'circle'
                  ? <circle cx="50" cy="50" r="38" fill={HUE[stimulus.color]} />
                  : <rect x="14" y="14" width="72" height="72" rx="6" fill={HUE[stimulus.color]} />}
              </svg>
            )
        )}
        {state.phase === 'stimulus' && (
          <div className="time-bar" key={state.trials.length}>
            <span style={{ animationDuration: `${layout.limitMs}ms` }} />
          </div>
        )}
        {state.phase === 'feedback' && <FeedbackMark correct={state.lastCorrect} />}
      </div>

      <div className="switch-answers">
        <button className="btn-custom btn-secondary btn-large" disabled={state.phase !== 'stimulus'} onPointerDown={() => answer('left')}>
          ← {t(left)}
        </button>
        <button className="btn-custom btn-secondary btn-large" disabled={state.phase !== 'stimulus'} onPointerDown={() => answer('right')}>
          {t(right)} →
        </button>
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.trials.length + 1, SWITCH.trials), total: SWITCH.trials }),
      <Lives left={state.lives} total={SWITCH.lives} />,
      `${t('common.score')}: ${state.score}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  const m = outcome.metrics;
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metrics.correct')}</span><span className="stat-value">{m.correct} / {m.trials}</span></div>
      <div className="stat-item"><span className="stat-label">{t('common.averageTime')}</span><span className="stat-value">{outcome.avgTimeMs} {t('common.ms')}</span></div>
      {m.switchCostMs !== undefined && (
        <div className="stat-item"><span className="stat-label">{t('metrics.switchCostMs')}</span><span className="stat-value">{m.switchCostMs > 0 ? '+' : ''}{m.switchCostMs} {t('common.ms')}</span></div>
      )}
    </div>
  );
};

const views: Views = { Intro, Board, Footer, Details };

export const TaskSwitch: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  return <GameShell game={getGame('dual-rule-reaction')} views={views} title={`🔀 ${t('games.dual-rule-reaction.title')}`} onBack={onBack} />;
};
