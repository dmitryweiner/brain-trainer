import { useState } from 'react';
import { Header, Button, GameCard, ProgressBar, ResultsModal } from './components/common';
import { GAMES_META } from './utils/constants';

function App() {
  const [score, setScore] = useState(42);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="app-container">
      <Header 
        totalScore={score} 
        showBackButton={false}
      />
      
      <div className="main-content">
        <h1 className="text-center">🧠 Brain Trainer</h1>
        
        <div className="card-custom text-center mb-3">
          <h2>Этап 2: Общие компоненты ✅</h2>
          <p>Все компоненты созданы и протестированы!</p>
          <p className="emoji emoji-large">⚡🎨👀🔍🔢🃏🧠🔄⏮️🔗</p>
        </div>
        
        {/* Демо Button */}
        <div className="card-custom mb-3">
          <h3>Button компонент</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setScore(score + 10)}>
              Primary +10
            </Button>
            <Button variant="secondary" onClick={() => setScore(Math.max(0, score - 5))}>
              Secondary -5
            </Button>
            <Button variant="success" onClick={() => setScore(score + 20)}>
              Success +20
            </Button>
            <Button variant="danger" onClick={() => setScore(0)}>
              Danger Reset
            </Button>
          </div>
        </div>
        
        {/* Демо ProgressBar */}
        <div className="card-custom mb-3">
          <h3>ProgressBar компонент</h3>
          <ProgressBar current={7} total={10} label="Раунд" />
        </div>
        
        {/* Демо GameCard */}
        <div className="card-custom mb-3">
          <h3>GameCard компонент (первые 3 игры)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {GAMES_META.slice(0, 3).map(game => (
              <GameCard 
                key={game.id}
                game={game}
                bestScore={Math.floor(Math.random() * 100)}
                onPlay={() => alert(`Запуск игры: ${game.title}`)}
              />
            ))}
          </div>
        </div>
        
        {/* Кнопка для ResultsModal */}
        <div className="card-custom mb-3 text-center">
          <h3>ResultsModal компонент</h3>
          <Button 
            variant="success" 
            size="large"
            onClick={() => setShowModal(true)}
          >
            Показать Results Modal
          </Button>
        </div>
        
        <div className="card-custom text-center">
          <p><strong>108 тестов</strong> прошли успешно! ✅</p>
          <p>Готово к Этапу 3: Хуки и контекст</p>
        </div>
      </div>
      
      <ResultsModal
        isOpen={showModal}
        score={85}
        statistics={[
          { label: 'Точность', value: '85%' },
          { label: 'Время', value: '2.5s' },
          { label: 'Правильных ответов', value: 17 },
        ]}
        onPlayAgain={() => {
          setShowModal(false);
          alert('Играем ещё раз!');
        }}
        onNextGame={() => {
          setShowModal(false);
          alert('Следующая игра!');
        }}
        onBackToMenu={() => setShowModal(false)}
      />
    </div>
  );
}

export default App;
