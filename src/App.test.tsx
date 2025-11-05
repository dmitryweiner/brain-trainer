import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
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
    render(<App />);
    expect(screen.queryByText('← Назад')).not.toBeInTheDocument();
  });

  it('should navigate to game when card is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const playButtons = screen.getAllByText('Играть');
    await user.click(playButtons[0]);

    // Должен отобразиться placeholder игры
    expect(screen.getByText(/Игра:/)).toBeInTheDocument();
    expect(screen.getByText('Компонент игры будет реализован на следующем этапе')).toBeInTheDocument();
  });

  it('should show back button when in game', async () => {
    const user = userEvent.setup();
    render(<App />);

    const playButtons = screen.getAllByText('Играть');
    await user.click(playButtons[0]);

    expect(screen.getByText('← Назад')).toBeInTheDocument();
  });

  it('should navigate back to menu from game', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Переход в игру
    const playButtons = screen.getAllByText('Играть');
    await user.click(playButtons[0]);

    expect(screen.getByText(/Игра:/)).toBeInTheDocument();

    // Возврат в меню
    await user.click(screen.getByText('← Назад'));

    expect(screen.getByText('Выберите игру')).toBeInTheDocument();
    expect(screen.queryByText(/Игра:/)).not.toBeInTheDocument();
  });

  it('should display game title in header when game is selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    const playButtons = screen.getAllByText('Играть');
    await user.click(playButtons[0]);

    // Заголовок должен содержать название игры
    expect(screen.getByText(/⚡ Reaction Click/)).toBeInTheDocument();
  });

  it('should display app title in header when in menu', () => {
    render(<App />);
    expect(screen.getByText('🧠 Brain Trainer')).toBeInTheDocument();
  });

  it('should handle navigation to different games', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Переход к первой игре
    let playButtons = screen.getAllByText('Играть');
    await user.click(playButtons[0]);
    expect(screen.getByText(/Игра: reaction-click/)).toBeInTheDocument();

    // Возврат в меню
    await user.click(screen.getByText('← Назад'));

    // Переход ко второй игре
    playButtons = screen.getAllByText('Играть');
    await user.click(playButtons[1]);
    expect(screen.getByText(/Игра: color-tap/)).toBeInTheDocument();
  });
});

