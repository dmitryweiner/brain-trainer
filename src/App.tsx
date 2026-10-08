import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScoreProvider, useScoreContext } from './context/ScoreContext';
import { GameHistoryProvider } from './context/GameHistoryContext';
import { Header } from './components/common';
import GameMenu from './components/GameMenu';
import { Profile } from './components/Profile';
import type { GameId } from './types/game.types';
import type { Route } from './core/platform';
import { findActiveGame, GAMES } from './core/games/registry';
import { activeSessions, dayKey } from './core/stats';
import { workoutProgress } from './core/stats/engagement';
import { textDirection, normalizeLanguage } from './core/i18n/languages';
import { ServicesProvider, useServices } from './ui/services';
import { createWebServices, type AppServices } from './ui/webServices';
import { GAME_SCREENS } from './ui/gameScreens';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { AppBanner } from './ui/AppBanner';
import { formatKey, parseKey } from './core/sync/key';

/** Unknown or retired game ids and unusable sync links fall back to the menu */
function normalize(route: Route, canSync: boolean): Route {
  if (route.view === 'game' && !findActiveGame(route.gameId)) return { view: 'menu' };
  if (route.view === 'link') {
    const key = parseKey(route.key);
    return canSync && key ? { view: 'link', key } : { view: 'menu' };
  }
  return route;
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
  const { navigation, sync, pwa, repository, clock } = useServices();
  const { t } = useTranslation();
  const [route, setRoute] = useState<Route>(() => normalize(navigation.current(), !!sync));
  // playing today's workout: "next game" goes to its next open slot
  const [inWorkout, setInWorkout] = useState(false);
  // where the menu was scrolled to, so coming back lands on the same game
  const menuScroll = useRef(0);
  const routeRef = useRef(route);
  const changeRoute = (next: Route) => {
    if (routeRef.current.view === 'menu' && next.view !== 'menu') menuScroll.current = window.scrollY;
    routeRef.current = next;
    setRoute(next);
  };
  useLayoutEffect(() => {
    window.scrollTo(0, route.view === 'menu' ? menuScroll.current : 0);
  }, [route]);
  const { totalScore } = useScoreContext();
  useDocumentLanguage();

  // Browser back/forward (and, in Capacitor, the hardware back button)
  useEffect(() => navigation.subscribe(r => changeRoute(normalize(r, !!sync))), [navigation, sync]);

  const go = (next: Route) => {
    changeRoute(next);
    navigation.go(next);
  };
  const backToMenu = () => {
    setInWorkout(false);
    go({ view: 'menu' });
  };
  const nextWorkoutGame = () => {
    const progress = workoutProgress(activeSessions(repository.events), dayKey(clock.wallNow()), GAMES);
    const next = progress.games.find(g => !g.done);
    if (next) go({ view: 'game', gameId: next.id });
    else backToMenu();
  };

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
          <Screen key={game!.id} onBack={backToMenu} onNextGame={inWorkout ? nextWorkoutGame : undefined} />
        ) : (
          <GameMenu
            onGameSelect={(gameId: GameId) => go({ view: 'game', gameId })}
            onWorkout={gameId => {
              setInWorkout(true);
              go({ view: 'game', gameId });
            }}
            now={clock.wallNow()}
          />
        )}
      </div>

      {pwa && <AppBanner pwa={pwa} />}

      {/* Opened from another device's link: #sync=<key> */}
      <ConfirmDialog
        open={route.view === 'link'}
        title={t('sync.connectTitle')}
        message={route.view === 'link' ? t('sync.connectText', { code: formatKey(route.key) }) : ''}
        confirmLabel={t('sync.connect')}
        onCancel={backToMenu}
        onConfirm={() => {
          if (route.view === 'link' && sync) void sync.connect(route.key);
          go({ view: 'profile' });
        }}
      />
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
