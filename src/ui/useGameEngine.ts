import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { EngineRunner } from '../core/engine/runner';
import { buildSession } from '../core/engine/session';
import { activeSessions, currentLevel } from '../core/stats';
import type { GameDefinition, GameEngine, GameSession, SessionOutcome } from '../core/types';
import { useEvents, useServices } from './services';

export type ShellPhase = 'intro' | 'playing' | 'results';

export interface FinishedSession {
  session: GameSession;
  outcome: SessionOutcome;
}

export interface UseGameEngineReturn<S, E> {
  phase: ShellPhase;
  /** Engine state while playing, and the final state on the results screen */
  state: S | null;
  level: number;
  dispatch: (event: E) => void;
  start: (variant?: string) => void;
  finished: FinishedSession | null;
}

const noopSubscribe = () => () => undefined;

/**
 * Runs `game.engine` and records the finished session exactly once — the
 * logic every v1 game copied into its component.
 */
export function useGameEngine<S, E>(game: GameDefinition): UseGameEngineReturn<S, E> {
  const { repository, scheduler, clock, feedback } = useServices();
  const engine = game.engine as GameEngine<S, E> | undefined;
  if (!engine) throw new Error(`${game.id} has no engine`);

  const [runner, setRunner] = useState<EngineRunner<S, E> | null>(null);
  const [finished, setFinished] = useState<FinishedSession | null>(null);
  const runnerRef = useRef<EngineRunner<S, E> | null>(null);

  const events = useEvents(repository);
  const level = useMemo(() => currentLevel(activeSessions(events), game), [events, game]);

  // the variant of the last start, so "play again" repeats it
  const variantRef = useRef<string | undefined>(undefined);

  const start = useCallback((variant?: string) => {
    if (variant !== undefined) variantRef.current = variant;
    runnerRef.current?.dispose();
    setFinished(null);
    const startedAt = clock.wallNow();
    const sessionLevel = currentLevel(activeSessions(repository.events), game);
    const next = new EngineRunner(engine, scheduler, {
      level: sessionLevel,
      seed: Math.floor(Math.random() * 2 ** 32),
      variant: variantRef.current,
      onFinish: (outcome, durationMs) => {
        const session = buildSession(game, outcome, { id: clock.newId(), startedAt, durationMs, level: sessionLevel });
        repository.addSession(session);
        setFinished({ session, outcome });
      },
    });
    // sound and vibration for hits and mistakes (engine.cues)
    if (engine.cues && feedback) {
      let prev = next.state;
      next.subscribe(state => {
        for (const cue of engine.cues!(prev, state)) feedback.play(cue);
        prev = state;
      });
    }
    runnerRef.current = next;
    setRunner(next);
  }, [engine, scheduler, clock, repository, game, feedback]);

  useEffect(() => () => runnerRef.current?.dispose(), []);

  const subscribe = useMemo(() => (runner ? (l: () => void) => runner.subscribe(l) : noopSubscribe), [runner]);
  const state = useSyncExternalStore(subscribe, () => (runner ? runner.state : null));

  const dispatch = useCallback((event: E) => runner?.dispatch(event), [runner]);

  const phase: ShellPhase = !runner ? 'intro' : finished ? 'results' : 'playing';
  return { phase, state, level, dispatch, start, finished };
}
