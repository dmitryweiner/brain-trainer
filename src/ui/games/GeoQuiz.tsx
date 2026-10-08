// One screen for the geography quizzes (core/games/geoQuiz).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameShell, type GameViews } from '../GameShell';
import { getGame } from '../../core/games/registry';
import type { GameId } from '../../core/types';
import { flagOf, FLAG_ONLY_FROM, GEO, optionCount, type GeoEvent, type GeoOptionKind, type GeoState } from '../../core/games/geoQuiz/engine';
import { CURRENCY_OF, LANGUAGES_OF } from '../../core/games/geoQuiz/facts';
import { GameIntro, StatusLine } from './common';
import type { ScreenProps } from '../gameScreens';
import './games.scss';

type Views = GameViews<GeoState, GeoEvent>;

const CONTINENT_ICON: Record<string, string> = {
  europe: '🌍', africa: '🌍', asia: '🌏', oceania: '🌏', 'north-america': '🌎', 'south-america': '🌎',
};

function OptionLabel({ kind, value }: { kind: GeoOptionKind; value: string }) {
  const { t } = useTranslation();
  switch (kind) {
    case 'flag':
      return <span className="geo-flag-option" role="img" aria-label={t(`countries.${value}`)}>{flagOf(value)}</span>;
    case 'capital':
      return <>{t(`capitals.${value}`)}</>;
    case 'continent':
      return <><span aria-hidden="true">{CONTINENT_ICON[value]}</span> {t(`continents.${value}`)}</>;
    case 'currency':
      return <>{t(`currencies.${value}`)}</>;
    case 'language':
      return <>{t(`languages.${value}`)}</>;
    default:
      return <>{t(`countries.${value}`)}</>;
  }
}

const Board: Views['Board'] = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const { question } = state;
  const { prompt } = question;
  const feedback = state.phase === 'feedback';
  return (
    <div className="flags">
      <div className="flags-question">
        {(prompt.show === 'flag' || prompt.show === 'flag+country') && (
          <span className="flags-flag" role="img" aria-label={prompt.show === 'flag' ? t('geo.thisFlag') : t(`countries.${prompt.code}`)}>
            {flagOf(prompt.code)}
          </span>
        )}
        {(prompt.show === 'country' || prompt.show === 'flag+country') && <p className="flags-country">{t(`countries.${prompt.code}`)}</p>}
        {prompt.show === 'capital' && <p className="flags-country">🏛️ {t(`capitals.${prompt.code}`)}</p>}
        {prompt.show === 'currency' && <p className="flags-country">💰 {t(`currencies.${CURRENCY_OF[prompt.code]}`)}</p>}
        {prompt.show === 'language' && <p className="flags-country">🗣️ {t(`languages.${LANGUAGES_OF[prompt.code]![0]}`)}</p>}
        <p className="game-prompt">{t(question.ask)}</p>
      </div>
      <div className={`flags-options ${question.optionKind === 'flag' ? 'as-flags' : ''}`}>
        {question.options.map(option => {
          const mark = feedback ? (option === question.answer ? 'right' : option === state.picked ? 'wrong' : '') : '';
          return (
            <button
              key={option}
              className={`board-cell flags-option ${mark}`}
              disabled={state.phase !== 'playing'}
              onClick={() => dispatch({ type: 'pick', option })}
            >
              <OptionLabel kind={question.optionKind} value={option} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Footer: Views['Footer'] = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusLine items={[
      t('game.roundOf', { n: Math.min(state.round + 1, GEO.rounds), total: GEO.rounds }),
      `${t('common.score')}: ${state.score}`,
    ]} />
  );
};

const Details: Views['Details'] = ({ outcome }) => {
  const { t } = useTranslation();
  return (
    <div className="results-details">
      <div className="stat-item"><span className="stat-label">{t('metrics.correct')}</span><span className="stat-value">{outcome.metrics.correct} / {outcome.metrics.rounds}</span></div>
      <div className="stat-item"><span className="stat-label">{t('common.averageTime')}</span><span className="stat-value">{(outcome.avgTimeMs / 1000).toFixed(1)} {t('game.seconds')}</span></div>
    </div>
  );
};

/** i18n group of each quiz's rules: geo.<group>.rule1/rule2 */
const RULES: Record<string, string> = {
  'flags-game': 'flagToCountry', 'flags-reverse': 'countryToFlag', capitals: 'capitals', continents: 'continents',
  currencies: 'currencies', languages: 'languages',
};

/** Quizzes that hide the country's name from level FLAG_ONLY_FROM */
const FLAG_ONLY_GAMES: readonly GameId[] = ['capitals', 'continents', 'currencies', 'languages'];

function screenFor(gameId: GameId): React.FC<ScreenProps> {
  const Intro: Views['Intro'] = ({ onStart, level }) => {
    const { t } = useTranslation();
    const group = RULES[gameId];
    const flagOnly = level >= FLAG_ONLY_FROM && FLAG_ONLY_GAMES.includes(gameId);
    return (
      <GameIntro gameId={gameId} level={level} onStart={onStart} rules={[`geo.${group}.rule1`, `geo.${group}.rule2`, 'geo.speedRule']}>
        <p className="intro-detail">
          {t('geo.layout', { options: gameId === 'continents' ? (level >= FLAG_ONLY_FROM ? 6 : 4) : optionCount(level) })}
          {flagOnly && ` ${t('geo.flagOnly')}`}
        </p>
      </GameIntro>
    );
  };
  const views: Views = { Intro, Board, Footer, Details };
  const Screen: React.FC<ScreenProps> = ({ onBack, onNextGame }) => (
    <GameShell game={getGame(gameId)} views={views} onBack={onBack} onNextGame={onNextGame} />
  );
  return Screen;
}

export const FlagToCountry = screenFor('flags-game');
export const CountryToFlag = screenFor('flags-reverse');
export const Capitals = screenFor('capitals');
export const Continents = screenFor('continents');
export const Currencies = screenFor('currencies');
export const Languages = screenFor('languages');
