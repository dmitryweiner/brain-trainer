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
import { Flags } from './games/Flags';
import { NBack } from './games/NBack';

export type GameScreen = React.FC<{ onBack: () => void }>;

export const GAME_SCREENS: Partial<Record<GameId, GameScreen>> = {
  'reaction-click': ({ onBack }) => <ReactionClick onBackToMenu={onBack} />,
  'odd-one-out': ({ onBack }) => <OddOneOut onBackToMenu={onBack} />,
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
  'n-back': NBack,
};
