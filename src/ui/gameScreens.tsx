// Game id → screen. Engine games render through GameShell; the rest are v1
// components until they are ported (PLAN-IMPROVEMENTS.md, stage 4).
import React from 'react';
import type { GameId } from '../core/types';
import { ReactionClick } from '../components/games/ReactionClick';
import { OddOneOut } from '../components/games/OddOneOut';
import MemoryFlip from '../components/games/MemoryFlip';
import SequenceRecall from '../components/games/SequenceRecall';
import DualRuleReaction from '../components/games/DualRuleReaction';
import NBack from '../components/games/NBack';
import { PhoneRecall } from '../components/games/PhoneRecall';
import { EmojiHunt } from '../components/games/EmojiHunt';
import { FlagsGame } from '../components/games/FlagsGame';

export type GameScreen = React.FC<{ onBack: () => void }>;

export const GAME_SCREENS: Partial<Record<GameId, GameScreen>> = {
  'reaction-click': ({ onBack }) => <ReactionClick onBackToMenu={onBack} />,
  'odd-one-out': ({ onBack }) => <OddOneOut onBackToMenu={onBack} />,
  'memory-flip': MemoryFlip,
  'sequence-recall': SequenceRecall,
  'dual-rule-reaction': DualRuleReaction,
  'n-back': NBack,
  'phone-recall': PhoneRecall,
  'emoji-hunt': EmojiHunt,
  'flags-game': FlagsGame,
};
