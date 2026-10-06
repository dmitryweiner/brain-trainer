import React, { useMemo } from 'react';
import './Confetti.scss';

const COLORS = ['#43a047', '#1e88e5', '#fdd835', '#e53935', '#8e24aa', '#fb8c00'];

/** A short burst of falling pieces; purely decorative */
export const Confetti: React.FC<{ pieces?: number }> = ({ pieces = 36 }) => {
  // fixed per mount: deterministic enough, no re-layout on re-render
  const bits = useMemo(
    () => Array.from({ length: pieces }, (_, i) => ({
      left: (i * 37) % 100,
      delay: ((i * 53) % 40) / 100,
      duration: 1.4 + ((i * 29) % 60) / 100,
      color: COLORS[i % COLORS.length],
      rotate: (i * 47) % 360,
    })),
    [pieces],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.left}%`,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            transform: `rotate(${b.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
