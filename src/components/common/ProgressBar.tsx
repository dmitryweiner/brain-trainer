import React from 'react';
import './ProgressBar.scss';

export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showNumbers?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showNumbers = true,
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div className="progress-bar-container">
      {(label || showNumbers) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showNumbers && (
            <span className="progress-numbers">
              {current} / {total}
            </span>
          )}
        </div>
      )}
      
      <div 
        className="progress-track" 
        role="progressbar" 
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label || `Прогресс: ${current} из ${total}`}
      >
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        >
          <span className="progress-percentage">{percentage}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

