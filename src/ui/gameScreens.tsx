// Game id → screen. Every game runs on its engine through GameShell.
import React from 'react';
import type { GameId } from '../core/types';
import { ReactionClick } from '../components/games/ReactionClick';
import { OddOneOut } from '../components/games/OddOneOut';
import { MemoryMatrix } from './games/MemoryMatrix';
import { Schulte } from './games/Schulte';
import { WhackAMole } from './games/WhackAMole';
import { TraceLine } from './games/TraceLine';
import { RotateShape } from './games/RotateShape';
import { SequenceRecall } from './games/SequenceRecall';
import { DigitSpan } from './games/DigitSpan';
import { TaskSwitch } from './games/TaskSwitch';
import { MemoryFlip } from './games/MemoryFlip';
import { EmojiHunt } from './games/EmojiHunt';
import { CarLogos, Capitals, Continents, Currencies, Flags } from './games/GeoQuiz';
import { NBack } from './games/NBack';
import { WhereWas } from './games/WhereWas';
import { Mirror } from './games/Mirror';
import { Maze } from './games/Maze';

export interface ScreenProps {
  onBack: () => void;
  /** Shown as "next game" on the results screen (the daily workout uses it) */
  onNextGame?: () => void;
}

export type GameScreen = React.FC<ScreenProps>;

export const GAME_SCREENS: Partial<Record<GameId, GameScreen>> = {
  'reaction-click': ({ onBack, onNextGame }) => <ReactionClick onBackToMenu={onBack} onNextGame={onNextGame} />,
  'odd-one-out': ({ onBack, onNextGame }) => <OddOneOut onBackToMenu={onBack} onNextGame={onNextGame} />,
  'memory-matrix': MemoryMatrix,
  schulte: Schulte,
  'whack-a-mole': WhackAMole,
  'trace-line': TraceLine,
  'rotate-shape': RotateShape,
  'sequence-recall': SequenceRecall,
  'phone-recall': DigitSpan,
  'dual-rule-reaction': TaskSwitch,
  'memory-flip': MemoryFlip,
  'emoji-hunt': EmojiHunt,
  'flags-game': Flags,
  capitals: Capitals,
  continents: Continents,
  currencies: Currencies,
  'car-logos': CarLogos,
  'n-back': NBack,
  'where-was': WhereWas,
  mirror: Mirror,
  maze: Maze,
};
