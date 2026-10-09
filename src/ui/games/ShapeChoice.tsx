// The "pick the right shape" layout of Mirror (with a mirror on one side of
// the target).
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Shape } from '../../core/games/shapes/polyomino';
import type { MirrorSide } from '../../core/games/mirror/engine';
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
  /** draws a mirror on this side of the target */
  mirrorSide?: MirrorSide;
}> = ({ prompt, target, options, answer, picked, feedback, disabled, onPick, mirrorSide }) => {
  const { t } = useTranslation();
  return (
    <div className="rotate-shape">
      <p className="game-prompt">{prompt}</p>
      <div className={`mirror-stage ${mirrorSide ? `mirror-${mirrorSide}` : ''}`}>
        <div className="rotate-target">
          <ShapeView shape={target} label={t('rotate.target')} />
        </div>
        {mirrorSide && <div className="mirror-glass" role="img" aria-label={t(`mirror.side.${mirrorSide}`)} />}
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
