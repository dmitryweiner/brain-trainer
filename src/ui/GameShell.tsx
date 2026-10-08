import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout, ResultsModal } from '../components/common';
import type { GameDefinition, SessionOutcome } from '../core/types';
import { useGameEngine } from './useGameEngine';

export interface GameViews<S, E> {
  /** Rules screen; calls onStart to begin */
  Intro: React.FC<{ onStart: (variant?: string) => void; level: number }>;
  /** The playing field: draws `state`, reports input through `dispatch` */
  Board: React.FC<{ state: S; dispatch: (event: E) => void }>;
  /** Score line under the field while playing */
  Footer?: React.FC<{ state: S }>;
  /** Extra numbers on the results screen */
  Details?: React.FC<{ state: S; outcome: SessionOutcome }>;
  /** One-line verdict on the results screen; by default it follows the rating */
  message?: (outcome: SessionOutcome, t: (key: string) => string) => string;
}

export interface GameShellProps<S, E> {
  game: GameDefinition;
  views: GameViews<S, E>;
  onBack: () => void;
  onNextGame?: () => void;
}

/** Generic one-liner by rating band */
// eslint-disable-next-line react-refresh/only-export-components
export function verdict(rating: number, t: (key: string) => string): string {
  if (rating >= 900) return t('results.verdict.top');
  if (rating >= 700) return t('results.verdict.great');
  if (rating >= 500) return t('results.verdict.good');
  if (rating >= 300) return t('results.verdict.ok');
  return t('results.verdict.low');
}

/** intro → engine → results, recording the session once (PLAN-IMPROVEMENTS.md, 5.2). */
export function GameShell<S, E>({ game, views, onBack, onNextGame }: GameShellProps<S, E>) {
  const { t } = useTranslation();
  const { phase, state, level, dispatch, start, finished } = useGameEngine<S, E>(game);
  const { Intro, Board, Footer, Details } = views;

  return (
    // the header already names the game: no second title above it
    <GameLayout footer={phase === 'playing' && state && Footer ? <Footer state={state} /> : undefined}>
      {phase === 'intro' && <Intro onStart={start} level={level} />}
      {phase === 'playing' && state && <Board state={state} dispatch={dispatch} />}

      <ResultsModal
        show={phase === 'results' && finished !== null}
        title={`🎮 ${t('common.gameOver')}`}
        score={finished?.session.score ?? 0}
        session={finished?.session}
        message={finished ? (views.message ? views.message(finished.outcome, t) : verdict(finished.session.rating, t)) : ''}
        details={finished && state && Details ? <Details state={state} outcome={finished.outcome} /> : undefined}
        onPlayAgain={() => start()}
        onBackToMenu={onBack}
        onNextGame={onNextGame}
      />
    </GameLayout>
  );
}

export default GameShell;
