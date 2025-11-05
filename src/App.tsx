import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app-container">
      <div className="main-content">
        <h1 className="text-center">🧠 Brain Trainer</h1>
        <div className="card-custom text-center">
          <h2>Тренажёр мозга для пожилых людей</h2>
          <p>Этап 1: Базовая инфраструктура завершён ✅</p>
          
          <div className="mt-4">
            <button 
              className="btn-custom btn-primary btn-large"
              onClick={() => setCount(count + 1)}
            >
              Счётчик: {count}
            </button>
          </div>
          
          <div className="mt-3">
            <p className="emoji emoji-large">⚡🎨👀🔍🔢🃏🧠🔄⏮️🔗</p>
            <p>10 мини-игр для тренировки когнитивных функций</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
