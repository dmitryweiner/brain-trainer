// Hare Race (reaction-click): two hares on the start line, a flag by day or a
// whistle by night, the quicker one gets the carrot (PLAN-REACTION-CLICK.md).
// The screen's other job is timing: it reports when the signal really
// reached the screen or the speaker, and timestamps taps by their input event.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import {
  HARE_RACE, opponentMeanMs, opponentOf, type Channel, type HareRaceEvent, type HareRaceState, type HareVariant, type Race,
} from '../../core/games/reactionClick/engine';
import { activeSessions } from '../../core/stats';
import type { Scheduler } from '../../core/platform';
import type { ToneOutput } from '../../platform/web/audio';
import { HorizontalBars } from '../charts/charts';
import { useEvents, useServices } from '../services';
import { GameIntro, StatusLine } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<HareRaceState, HareRaceEvent>;

const MODE_KEY = 'brain-trainer-hare-mode';
const MODES: { id: HareVariant; icon: string }[] = [
  { id: 'visual', icon: '☀️' }, { id: 'audio', icon: '🌙' }, { id: 'mixed', icon: '☀️🌙' },
];

function savedMode(): HareVariant {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'visual' || v === 'audio' || v === 'mixed' ? v : 'mixed';
  } catch {
    return 'mixed';
  }
}

function saveMode(mode: HareVariant): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // a remembered choice is only a convenience
  }
}

/** The judge's whistle: short, with a sharp front so its start is unambiguous */
function whistle(audio: ToneOutput): void {
  audio.tone(1000, 80, 2);
}

/**
 * A performance.now() timestamp (an input event, an animation frame) on the
 * scheduler's clock. On the web they are the same clock; elsewhere (tests)
 * the event's age is what carries over.
 */
function fromPerf(scheduler: Scheduler, perfTime: number): number {
  const age = typeof performance !== 'undefined' ? performance.now() - perfTime : 0;
  // a timestamp on some other clock (old WebViews, tests): the handler's own time
  return age >= 0 && age < 1000 ? scheduler.now() - age : scheduler.now();
}

/** Night races need sound: on, and Web Audio present */
function useSoundReady(): boolean {
  const { audio, prefs } = useServices();
  const { sound } = useSyncExternalStore(l => prefs.subscribe(l), () => prefs.get());
  return sound && !!audio && audio.available();
}

function useOpponentName(level: number): string {
  const { t } = useTranslation();
  return t(`hare.opponents.${opponentOf(level).id}`);
}

const Intro: Views['Intro'] = ({ onStart, level }) => {
  const { t } = useTranslation();
  const { audio } = useServices();
  const soundReady = useSoundReady();
  const [chosen, setChosen] = useState(savedMode);
  const mode: HareVariant = soundReady ? chosen : 'visual';
  const opponent = opponentOf(level);
  const choose = (m: HareVariant) => {
    setChosen(m);
    saveMode(m);
  };
  const start = () => {
    // a user gesture: the audio output wakes up now, not at the first whistle
    if (mode !== 'visual') audio?.warmUp();
    onStart(mode);
  };
  return (
    <GameIntro
      gameId="reaction-click"
      level={level}
      onStart={onStart}
      rules={['hare.rule1', 'hare.rule2', 'hare.rule3']}
      actions={(
        <button className="btn-custom btn-primary btn-large btn-full" onClick={start}>
          {t('common.startGame')}
        </button>
      )}
    >
      <p className="intro-detail">
        {t('hare.opponentToday', { icon: opponent.icon, name: t(`hare.opponents.${opponent.id}`), ms: opponentMeanMs(level) })}
      </p>
      <div className="hare-modes" role="group" aria-label={t('hare.modeLabel')}>
        {MODES.map(m => (
          <button
            key={m.id}
            className={`hare-mode ${mode === m.id ? 'active' : ''}`}
            aria-pressed={mode === m.id}
            disabled={!soundReady && m.id !== 'visual'}
            onClick={() => choose(m.id)}
          >
            <span aria-hidden="true">{m.icon}</span> {t(`hare.mode.${m.id}`)}
          </button>
        ))}
      </div>
      {soundReady ? (
        <button className="btn-custom btn-secondary btn-full hare-whistle" onClick={() => audio && (audio.warmUp(), whistle(audio))}>
          🦉 {t('hare.testWhistle')}
        </button>
      ) : (
        <p className="intro-detail hare-note">🔇 {t('hare.soundOff')}</p>
      )}
      <details className="hare-accuracy">
        <summary>{t('hare.accuracyTitle')}</summary>
        <ul>
          <li>{t('hare.accuracy1')}</li>
          <li>{t('hare.accuracy2')}</li>
          <li>{t('hare.accuracy3')}</li>
        </ul>
      </details>
    </GameIntro>
  );
};

/** What the finish shows: who ran, who got the carrot */
function finishCaption(race: Race, name: string, t: (key: string, o?: Record<string, unknown>) => string): string {
  if (race.result === 'falseStart') return t('hare.falseStart');
  if (race.result === 'timeout') return t('hare.asleep');
  return race.result === 'win' ? t('hare.won', { ms: race.rt }) : t('hare.lost', { ms: race.rt, name });
}

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { scheduler, audio } = useServices();
  const name = useOpponentName(state.level);
  const field = useRef<HTMLDivElement>(null);
  const { phase, current } = state;
  const night = current.channel === 'audio';
  const finish = phase === 'review' ? state.races[state.races.length - 1] : null;

  // When the signal really went out: the frame that drew the flag, or the
  // moment the whistle reaches the speaker. The reaction is timed from there.
  useLayoutEffect(() => {
    if (phase !== 'signal' || current.shown) return;
    if (current.channel === 'audio') {
      if (audio) whistle(audio);
      dispatch({ type: 'shown', at: audio ? scheduler.now() + audio.latencyMs() : undefined });
      return;
    }
    if (typeof requestAnimationFrame !== 'function') {
      dispatch({ type: 'shown' });
      return;
    }
    const frame = requestAnimationFrame(time => dispatch({ type: 'shown', at: fromPerf(scheduler, time) }));
    return () => cancelAnimationFrame(frame);
  }, [phase, current.shown, current.channel, audio, scheduler, dispatch]);

  // Space or Enter anywhere but on another control; held keys repeat, and do not count
  useEffect(() => {
    field.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.target instanceof Element && e.target !== field.current && e.target.closest('button, a, input, select, textarea')) return;
      e.preventDefault();
      if (e.repeat) return;
      dispatch({ type: 'tap', at: fromPerf(scheduler, e.timeStamp) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, scheduler]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // the event's own time: when the finger landed, not when the handler ran
    dispatch({ type: 'tap', at: fromPerf(scheduler, e.nativeEvent.timeStamp) });
  };

  // Until the tap nothing on the field changes but the signal itself — and
  // at night not even that: the whistle is the only signal.
  const caption = finish ? finishCaption(finish, name, t) : t(night ? 'hare.waitNight' : 'hare.waitDay');
  const flagUp = finish !== null || (!night && phase === 'signal');
  const you = !finish ? 'start' : finish.result === 'win' ? 'winner' : finish.rt !== undefined ? 'runner' : 'sleeper';
  const them = !finish ? 'start' : finish.result === 'win' ? 'runner' : 'winner';

  return (
    <div className="hare-race">
      <div
        ref={field}
        className={`hare-field ${night ? 'night' : 'day'} ${flagUp ? 'flag-up' : ''} ${finish ? 'finish' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={t('hare.tapField')}
        onPointerDown={onPointerDown}
      >
        <p className={`hare-caption ${finish ? finish.result : ''}`} role="status">{caption}</p>
        <span className="hare-sky-body" aria-hidden="true">{night ? '🌙' : '☀️'}</span>
        <span className="hare-start-line" aria-hidden="true" />
        <span className="hare-carrot" aria-hidden="true">🥕</span>
        <div className={`hare-lane them ${them}`}>
          <span className="hare-runner">
            <span className="hare-tag">{finish && them === 'winner' ? '🥕 ' : ''}{name}</span>
            <span className="hare" aria-hidden="true">🐇</span>
          </span>
        </div>
        <span className="hare-judge" aria-hidden="true">
          {night && <span className="hare-owl">🦉</span>}
          <span className="hare-flag">🚩</span>
        </span>
        <div className={`hare-lane you ${you}`}>
          <span className="hare-runner">
            <span className="hare-tag">{finish && you === 'winner' ? '🥕 ' : you === 'sleeper' ? '🥱 ' : ''}{t('hare.you')}</span>
            <span className="hare" aria-hidden="true">🐇</span>
          </span>
        </div>
        <span className="hare-grass" aria-hidden="true">🌿🌱🌿🌾🌿🌱🌿🌾🌿🌱🌿🌱🌿🌾🌿🌱🌿🌾🌿🌱🌿🌱</span>
        {finish && (
          <p className="hare-times">
            {t('hare.you')} {finish.rt !== undefined ? `${finish.rt} ${t('common.ms')}` : '—'}
            {' · '}
            {name} {finish.opponentMs} {t('common.ms')}
          </p>
        )}
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  const n = state.races.length + (state.phase === 'review' ? 0 : 1);
  const wins = state.races.filter(r => r.result === 'win').length;
  return (
    <StatusLine items={[
      `${t('hare.race')} ${Math.min(n, HARE_RACE.races)}/${HARE_RACE.races}`,
      `${t('hare.wins')}: ${wins}`,
      `${t('common.score')}: ${state.score}`,
      state.combo >= HARE_RACE.comboStep && `${t('hare.streak')} ×2`,
    ]} />
  );
};

/** Reaction time bands for the distribution */
const BANDS: [number, number][] = [[0, 250], [250, 350], [350, 500], [500, 800], [800, Infinity]];

const CHANNEL_ICON: Record<Channel, string> = { visual: '☀️', audio: '🌙' };
const RESULT_ICON: Record<Race['result'], string> = { win: '🥕', lose: '❌', falseStart: '⚠️', timeout: '💤' };

const Details: Views['Details'] = ({ state, outcome }) => {
  const { t } = useTranslation();
  const { repository } = useServices();
  const events = useEvents(repository);
  const name = useOpponentName(state.level);
  const m = outcome.metrics;

  // records of earlier Hare Race sessions (the last one is this session)
  const earlier = useMemo(() => {
    const mine = activeSessions(events).filter(s => s.gameId === 'reaction-click' && s.metrics.rules === HARE_RACE.rules);
    const before = mine.slice(0, -1);
    const best = (key: string) => {
      const values = before.flatMap(s => (s.metrics[key] === undefined ? [] : [s.metrics[key]]));
      return values.length > 0 ? Math.min(...values) : undefined;
    };
    return { visual: best('bestVisualMs'), audio: best('bestAudioMs') };
  }, [events]);

  const tile = (channel: Channel) => {
    const medianMs = m[channel === 'visual' ? 'visualMedianMs' : 'audioMedianMs'];
    const bestMs = m[channel === 'visual' ? 'bestVisualMs' : 'bestAudioMs'];
    if (medianMs === undefined) return null;
    const previous = earlier[channel];
    const record = previous === undefined || bestMs < previous;
    return (
      <div className={`hare-tile ${channel}`}>
        <span className="hare-tile-label">{t(channel === 'visual' ? 'hare.dayTile' : 'hare.nightTile')}</span>
        <span className="hare-tile-value">{medianMs} {t('common.ms')}</span>
        <span className="hare-tile-note">{t('hare.medianNote')}</span>
        <span className="hare-tile-note">
          {record && previous !== undefined ? t('hare.newRecord', { ms: bestMs }) : t('hare.record', { ms: Math.min(bestMs, previous ?? bestMs) })}
        </span>
      </div>
    );
  };

  const diff = m.visualMedianMs !== undefined && m.audioMedianMs !== undefined ? m.visualMedianMs - m.audioMedianMs : null;
  const times = state.races.flatMap(r => (r.rt === undefined ? [] : [r.rt]));
  const rows = BANDS.map(([lo, hi]) => ({
    key: `${lo}`,
    label: hi === Infinity ? `≥ ${lo} ${t('common.ms')}` : `${lo}–${hi} ${t('common.ms')}`,
    value: times.filter(ms => ms >= lo && ms < hi).length,
  }));

  return (
    <div className="results-details hare-details">
      <div className="stat-item highlight">
        <span className="stat-label">🥕 {t('hare.winsOf', { wins: m.wins, races: m.races })}</span>
        <span className="stat-value">{opponentOf(state.level).icon} {name}</span>
      </div>
      <p className="hare-against">{t('hare.against', { name, ms: m.opponentMs })}</p>
      {(m.visualMedianMs !== undefined || m.audioMedianMs !== undefined) && (
        <div className="hare-tiles">{tile('visual')}{tile('audio')}</div>
      )}
      {diff !== null && (
        <p className="hare-compare">
          {diff > 0 ? t('hare.nightFaster', { ms: diff }) : diff < 0 ? t('hare.dayFaster', { ms: -diff }) : t('hare.sameSpeed')}
        </p>
      )}
      {times.length === 0 && <p className="text-muted">{t('hare.noTimes')}</p>}

      <h4 className="details-heading">{t('hare.racesHeading')}</h4>
      <ol className="hare-races">
        {state.races.map((r, i) => (
          <li key={i} className={r.result}>
            <span className="hare-races-n">{i + 1}</span>
            <span aria-label={t(r.channel === 'visual' ? 'hare.mode.visual' : 'hare.mode.audio')}>{CHANNEL_ICON[r.channel]}</span>
            <span className="hare-races-you">
              {r.rt !== undefined ? `${r.rt} ${t('common.ms')}` : t(r.result === 'timeout' ? 'hare.asleepShort' : 'hare.falseStartShort')}
            </span>
            <span className="hare-races-them">{name} {r.opponentMs}</span>
            <span aria-hidden="true">{RESULT_ICON[r.result]}</span>
          </li>
        ))}
      </ol>

      {times.length > 0 && (
        <>
          <h4 className="details-heading">{t('hare.distribution')}</h4>
          <HorizontalBars rows={rows} max={Math.max(1, ...rows.map(r => r.value))} />
        </>
      )}
    </div>
  );
};

const views: Views = {
  Intro,
  Board,
  Footer,
  Details,
  message: (outcome, t) => {
    const { wins, medianMs } = outcome.metrics;
    if (medianMs === undefined) return t('hare.results.asleep');
    if (wins >= 9) return t('hare.results.champion');
    if (wins >= 7) return t('hare.results.great');
    if (wins >= 5) return t('hare.results.good');
    return t('hare.results.tryAgain');
  },
};

export const HareRace: React.FC<ScreenProps> = ({ onBack, onNextGame }) => {
  return <GameShell game={getGame('reaction-click')} views={views} onBack={onBack} onNextGame={onNextGame} />;
};
