import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/** The play button of the card with this (Russian) title */
const playButtonFor = (title: string) =>
  within(screen.getByText(title).closest('.game-card') as HTMLElement).getByRole('button', { name: /играть/i });

describe('App', () => {
  // Clear URL hash before each test to ensure clean state
  beforeEach(() => {
    window.location.hash = '';
  });
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByText('Выберите игру')).toBeInTheDocument();
  });

  it('should display header with total score', () => {
    render(<App />);
    expect(screen.getByText('Очки:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should show game menu by default', () => {
    render(<App />);
    expect(screen.getByText('Выберите игру')).toBeInTheDocument();
    expect(screen.getByText('Тренируйте свой мозг с помощью увлекательных мини-игр')).toBeInTheDocument();
  });

  it('should not show back button in menu', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.back-button')).not.toBeInTheDocument();
  });

  it('should navigate to game when card is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(playButtonFor('Скорость реакции'));

    // Должен отобразиться экран игры Reaction Click
    expect(screen.getByText('Начать игру')).toBeInTheDocument();
    expect(screen.getByText('Тренировка скорости реакции')).toBeInTheDocument();
  });

  it('should show back button when in game', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(playButtonFor('Скорость реакции'));

    expect(container.querySelector('.back-button')).toBeInTheDocument();
  });

  it('should navigate back to menu from game', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    // Переход в игру
    await user.click(playButtonFor('Скорость реакции'));

    expect(screen.getByText('Начать игру')).toBeInTheDocument();

    // Возврат в меню
    const backButton = container.querySelector('.back-button') as HTMLElement;
    await user.click(backButton);

    expect(screen.getByText('Выберите игру')).toBeInTheDocument();
    expect(screen.queryByText('Начать игру')).not.toBeInTheDocument();
  });

  it('should display game title in header when game is selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(playButtonFor('Скорость реакции'));

    // Название в шапке переведено (раньше там был английский title из GAMES_META)
    const titles = screen.getAllByText(/⚡ Скорость реакции/);
    expect(titles.length).toBeGreaterThan(0);
  });

  it('should display app title in header when in menu', () => {
    render(<App />);
    // i18n translates 'app.title' to 'Тренажёр мозга'
    expect(screen.getByText(/Тренажёр мозга/)).toBeInTheDocument();
  });

  it('should handle navigation to different games', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    // Переход к первой игре (Reaction Click)
    await user.click(playButtonFor('Скорость реакции'));
    expect(screen.getByText('Начать игру')).toBeInTheDocument();

    // Возврат в меню
    const backButton = container.querySelector('.back-button') as HTMLElement;
    await user.click(backButton);

    // Переход ко второй игре (Odd One Out)
    await user.click(playButtonFor('Найди лишний'));
    expect(screen.getByText(/Ваш уровень: 1 из 10/)).toBeInTheDocument();
  });

  it('should send a retired game id back to the menu', () => {
    window.location.hash = 'color-tap';
    render(<App />);
    expect(screen.getByText('Выберите игру')).toBeInTheDocument();
  });

  it('should set RTL and remember the language when switching to Hebrew', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Change language' }));
    await user.click(screen.getByText('עברית'));
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
    expect(localStorage.getItem('brain-trainer-language')).toBe('he');

    await user.click(screen.getByRole('button', { name: 'Change language' }));
    await user.click(screen.getByText('Русский'));
    expect(document.documentElement.dir).toBe('ltr');
  });
});
