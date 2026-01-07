import { useState } from 'react';
import { ScoreProvider, useScoreContext } from './context/ScoreContext';
import { Header } from './components/common';
import GameMenu from './components/GameMenu';
import type { GameId } from './types/game.types';
import { GAMES_META, GAME_IDS } from './utils/constants';
import { ReactionClick } from './components/games/ReactionClick';
import { ColorTap } from './components/games/ColorTap';
import { SymbolMatch } from './components/games/SymbolMatch';
import { OddOneOut } from './components/games/OddOneOut';
import { HiddenNumber } from './components/games/HiddenNumber';
import MemoryFlip from './components/games/MemoryFlip';
import SequenceRecall from './components/games/SequenceRecall';
import DualRuleReaction from './components/games/DualRuleReaction';
import NBack from './components/games/NBack';
import LogicPairConcept from './components/games/LogicPairConcept';
import { PhoneRecall } from './components/games/PhoneRecall';
import { EmojiHunt } from './components/games/EmojiHunt';

function AppContent() {
  const [currentGame, setCurrentGame] = useState<GameId | null>(null);
  const { totalScore } = useScoreContext();

  const handleGameSelect = (gameId: GameId) => {
    setCurrentGame(gameId);
  };

  const handleBackToMenu = () => {
    setCurrentGame(null);
  };

  const getCurrentGameTitle = () => {
    if (!currentGame) return undefined;
    const game = GAMES_META.find(g => g.id === currentGame);
    return game ? `${game.icon} ${game.title}` : undefined;
  };

  return (
    <div className="app-container">
      <Header
        totalScore={totalScore}
        showBackButton={currentGame !== null}
        onBack={handleBackToMenu}
        gameTitle={getCurrentGameTitle()}
      />

      <div className="main-content">
        {currentGame === null ? (
          <GameMenu onGameSelect={handleGameSelect} />
        ) : currentGame === GAME_IDS.REACTION_CLICK ? (
          <ReactionClick onBackToMenu={handleBackToMenu} />
        ) : currentGame === GAME_IDS.COLOR_TAP ? (
          <ColorTap onBackToMenu={handleBackToMenu} />
        ) : currentGame === GAME_IDS.SYMBOL_MATCH ? (
          <SymbolMatch onBackToMenu={handleBackToMenu} />
        ) : currentGame === GAME_IDS.ODD_ONE_OUT ? (
          <OddOneOut onBackToMenu={handleBackToMenu} />
        ) : currentGame === GAME_IDS.HIDDEN_NUMBER ? (
          <HiddenNumber onBackToMenu={handleBackToMenu} />
        ) : currentGame === GAME_IDS.MEMORY_FLIP ? (
          <MemoryFlip onBack={handleBackToMenu} />
        ) : currentGame === GAME_IDS.SEQUENCE_RECALL ? (
          <SequenceRecall onBack={handleBackToMenu} />
        ) : currentGame === GAME_IDS.DUAL_RULE ? (
          <DualRuleReaction onBack={handleBackToMenu} />
        ) : currentGame === GAME_IDS.N_BACK ? (
          <NBack onBack={handleBackToMenu} />
        ) : currentGame === GAME_IDS.LOGIC_PAIR ? (
          <LogicPairConcept onBack={handleBackToMenu} />
        ) : currentGame === GAME_IDS.PHONE_RECALL ? (
          <PhoneRecall onBack={handleBackToMenu} />
        ) : currentGame === GAME_IDS.EMOJI_HUNT ? (
          <EmojiHunt onBack={handleBackToMenu} />
        ) : (
          <div className="game-placeholder">
            <div className="card-custom text-center">
              <h2>Игра: {currentGame}</h2>
              <p>Компонент игры будет реализован позже</p>
              <button 
                className="btn-custom btn-primary btn-large"
                onClick={handleBackToMenu}
              >
                Вернуться в меню
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ScoreProvider>
      <AppContent />
    </ScoreProvider>
  );
}

export default App;
