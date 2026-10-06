import React from 'react';
import type { Shape } from '../../core/games/shapes/polyomino';

/** A polyomino drawn in SVG, centred in a square of `box` cells */
export const ShapeView: React.FC<{ shape: Shape; box?: number; className?: string; label?: string }> = ({
  shape, box = 6, className, label,
}) => {
  const w = Math.max(...shape.map(c => c[0])) + 1;
  const h = Math.max(...shape.map(c => c[1])) + 1;
  const ox = (box - w) / 2;
  const oy = (box - h) / 2;
  return (
    <svg className={`shape-view ${className ?? ''}`} viewBox={`0 0 ${box} ${box}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {shape.map(([x, y]) => (
        <rect key={`${x},${y}`} x={ox + x + 0.04} y={oy + y + 0.04} width="0.92" height="0.92" rx="0.12" />
      ))}
    </svg>
  );
};
