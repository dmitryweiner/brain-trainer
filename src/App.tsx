import { useState, useEffect, useCallback } from 'react';
import { ScoreProvider, useScoreContext } from './context/ScoreContext';
import { GameHistoryProvider } from './context/GameHistoryContext';
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
import { FlagsGame } from './components/games/FlagsGame';
import { Profile } from './components/Profile';

type AppView = 'menu' | 'game' | 'profile';

// Parse hash from URL
const parseHash = (): { view: AppView; gameId: GameId | null } => {
  const hash = window.location.hash.replace('#', '');
  
  if (hash === 'profile') {
    return { view: 'profile', gameId: null };
  }
  
  // Check if hash is a valid game ID
  const gameIds = Object.values(GAME_IDS);
  if (gameIds.includes(hash as GameId)) {
    return { view: 'game', gameId: hash as GameId };
  }
  
  return { view: 'menu', gameId: null };
};

function AppContent() {
  // Initialize state from URL
  const initialState = parseHash();
  const [currentGame, setCurrentGame] = useState<GameId | null>(initialState.gameId);
  const [currentView, setCurrentView] = useState<AppView>(initialState.view);
  const { totalScore } = useScoreContext();

  // Update URL when view/game changes
  const updateUrl = useCallback((view: AppView, gameId: GameId | null) => {
    let newHash = '';
    if (view === 'profile') {
      newHash = 'profile';
    } else if (view === 'game' && gameId) {
      newHash = gameId;
    }
    
    // Only update if hash actually changed
    if (window.location.hash.replace('#', '') !== newHash) {
      window.location.hash = newHash;
    }
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const { view, gameId } = parseHash();
      setCurrentView(view);
      setCurrentGame(gameId);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleGameSelect = (gameId: GameId) => {
    setCurrentGame(gameId);
    setCurrentView('game');
    updateUrl('game', gameId);
  };

  const handleBackToMenu = () => {
    setCurrentGame(null);
    setCurrentView('menu');
    updateUrl('menu', null);
  };

  const handleProfileClick = () => {
    setCurrentView('profile');
    updateUrl('profile', null);
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
        showBackButton={currentView !== 'menu'}
        onBack={handleBackToMenu}
        gameTitle={currentView === 'game' ? getCurrentGameTitle() : undefined}
        onProfileClick={handleProfileClick}
        showProfileButton={currentView === 'menu'}
      />

      <div className="main-content">
        {currentView === 'profile' ? (
          <Profile onBack={handleBackToMenu} />
        ) : currentView === 'menu' ? (
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
        ) : currentGame === GAME_IDS.FLAGS_GAME ? (
          <FlagsGame onBack={handleBackToMenu} />
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
      <GameHistoryProvider>
        <AppContent />
      </GameHistoryProvider>
    </ScoreProvider>
  );
}

export default App;
