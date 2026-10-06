import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout, ResultsModal } from '../components/common';
import type { GameDefinition, SessionOutcome } from '../core/types';
import { useGameEngine } from './useGameEngine';

export interface GameViews<S, E> {
  /** Rules screen; calls onStart to begin */
  Intro: React.FC<{ onStart: () => void; level: number }>;
  /** The playing field: draws `state`, reports input through `dispatch` */
  Board: React.FC<{ state: S; dispatch: (event: E) => void }>;
  /** Score line under the field while playing */
  Footer?: React.FC<{ state: S }>;
  /** Extra numbers on the results screen */
  Details?: React.FC<{ state: S; outcome: SessionOutcome }>;
  /** One-line verdict on the results screen */
  message: (outcome: SessionOutcome, t: (key: string) => string) => string;
}

export interface GameShellProps<S, E> {
  game: GameDefinition;
  views: GameViews<S, E>;
  title: string;
  onBack: () => void;
  onNextGame?: () => void;
}

/** intro → engine → results, recording the session once (PLAN-IMPROVEMENTS.md, 5.2). */
export function GameShell<S, E>({ game, views, title, onBack, onNextGame }: GameShellProps<S, E>) {
  const { t } = useTranslation();
  const { phase, state, level, dispatch, start, finished } = useGameEngine<S, E>(game);
  const { Intro, Board, Footer, Details } = views;

  return (
    <GameLayout title={title} footer={phase === 'playing' && state && Footer ? <Footer state={state} /> : undefined}>
      {phase === 'intro' && <Intro onStart={start} level={level} />}
      {phase === 'playing' && state && <Board state={state} dispatch={dispatch} />}

      <ResultsModal
        show={phase === 'results' && finished !== null}
        title={`🎮 ${t('common.gameOver')}`}
        score={finished?.session.score ?? 0}
        session={finished?.session}
        message={finished ? views.message(finished.outcome, t) : ''}
        details={finished && state && Details ? <Details state={state} outcome={finished.outcome} /> : undefined}
        onPlayAgain={start}
        onBackToMenu={onBack}
        onNextGame={onNextGame}
      />
    </GameLayout>
  );
}

export default GameShell;
