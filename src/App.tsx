import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScoreProvider, useScoreContext } from './context/ScoreContext';
import { GameHistoryProvider } from './context/GameHistoryContext';
import { Header } from './components/common';
import GameMenu from './components/GameMenu';
import { Profile } from './components/Profile';
import type { GameId } from './types/game.types';
import type { Route } from './core/platform';
import { findActiveGame } from './core/games/registry';
import { textDirection, normalizeLanguage } from './core/i18n/languages';
import { ServicesProvider, useServices } from './ui/services';
import { createWebServices, type AppServices } from './ui/webServices';
import { GAME_SCREENS } from './ui/gameScreens';

/** Unknown or retired game ids fall back to the menu */
function normalize(route: Route): Route {
  return route.view === 'game' && !findActiveGame(route.gameId) ? { view: 'menu' } : route;
}

/** Keeps <html dir/lang> in line with i18n and remembers the user's choice. */
function useDocumentLanguage() {
  const { i18n } = useTranslation();
  const { locale } = useServices();
  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.lang = normalizeLanguage(lng);
      document.documentElement.dir = textDirection(lng);
    };
    const onChange = (lng: string) => {
      apply(lng);
      locale.save(normalizeLanguage(lng));
    };
    apply(i18n.language);
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, [i18n, locale]);
}

function AppContent() {
  const { navigation } = useServices();
  const { t } = useTranslation();
  const [route, setRoute] = useState<Route>(() => normalize(navigation.current()));
  const { totalScore } = useScoreContext();
  useDocumentLanguage();

  // Browser back/forward (and, in Capacitor, the hardware back button)
  useEffect(() => navigation.subscribe(r => setRoute(normalize(r))), [navigation]);

  const go = (next: Route) => {
    navigation.go(next);
    setRoute(next);
  };
  const backToMenu = () => go({ view: 'menu' });

  const game = route.view === 'game' ? findActiveGame(route.gameId) : undefined;
  const Screen = game ? GAME_SCREENS[game.id] : undefined;

  return (
    <div className="app-container">
      <Header
        totalScore={totalScore}
        showBackButton={route.view !== 'menu'}
        onBack={backToMenu}
        gameTitle={game ? `${game.icon} ${t(`games.${game.id}.title`)}` : undefined}
        onProfileClick={() => go({ view: 'profile' })}
        showProfileButton={route.view === 'menu'}
      />

      <div className="main-content">
        {route.view === 'profile' ? (
          <Profile onBack={backToMenu} />
        ) : Screen ? (
          <Screen key={game!.id} onBack={backToMenu} />
        ) : (
          <GameMenu onGameSelect={(gameId: GameId) => go({ view: 'game', gameId })} />
        )}
      </div>
    </div>
  );
}

export interface AppProps {
  /** Injected by main.tsx; tests may omit it */
  services?: AppServices;
}

function App({ services }: AppProps) {
  const [own] = useState(() => services ?? createWebServices());
  return (
    <ServicesProvider services={own}>
      <ScoreProvider>
        <GameHistoryProvider>
          <AppContent />
        </GameHistoryProvider>
      </ScoreProvider>
    </ServicesProvider>
  );
}

export default App;
