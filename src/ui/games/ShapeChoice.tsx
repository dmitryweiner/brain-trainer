// The "pick the right shape" layout shared by Rotate the shape and Mirror.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Shape } from '../../core/games/shapes/polyomino';
import { ShapeView } from './ShapeView';

export const ShapeChoice: React.FC<{
  prompt: string;
  target: Shape;
  options: Shape[];
  answer: number;
  picked: number | null;
  feedback: boolean;
  disabled: boolean;
  onPick: (index: number) => void;
  /** draws a mirror line next to the target */
  mirrorLine?: boolean;
}> = ({ prompt, target, options, answer, picked, feedback, disabled, onPick, mirrorLine }) => {
  const { t } = useTranslation();
  return (
    <div className="rotate-shape">
      <p className="game-prompt">{prompt}</p>
      <div className={`rotate-target ${mirrorLine ? 'with-mirror' : ''}`}>
        <ShapeView shape={target} label={t('rotate.target')} />
      </div>
      <div className="rotate-options">
        {options.map((shape, i) => (
          <button
            key={i}
            className={`board-cell rotate-option ${feedback ? (i === answer ? 'right' : i === picked ? 'wrong' : '') : ''}`}
            disabled={disabled}
            onClick={() => onPick(i)}
            aria-label={t('rotate.option', { n: i + 1 })}
          >
            <ShapeView shape={shape} />
          </button>
        ))}
      </div>
    </div>
  );
};
