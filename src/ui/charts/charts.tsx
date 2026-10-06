// Small single-series charts for ratings (0–1000). Specs follow the dataviz
// method: 2px lines, ≥8px markers with a surface ring, bars ≤24px with a 4px
// rounded data end, recessive hairline grid, text in text colors only.
import React, { useState } from 'react';
import './charts.scss';

export const RATING_MAX = 1000;

/** Rating as a ring meter around the number */
export const RatingRing: React.FC<{ value: number; label: string; caption?: string }> = ({ value, label, caption }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  const share = Math.min(1, Math.max(0, value / RATING_MAX));
  return (
    <div className="rating-ring" role="img" aria-label={`${label}: ${value} / ${RATING_MAX}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="rating-ring-track" cx="60" cy="60" r={r} />
        <circle
          className="rating-ring-fill"
          cx="60" cy="60" r={r}
          strokeDasharray={`${share * c} ${c}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="rating-ring-text">
        <div className="rating-ring-value">{value}</div>
        <div className="rating-ring-label">{label}</div>
        {caption && <div className="rating-ring-caption">{caption}</div>}
      </div>
    </div>
  );
};

/** Trend line for a stat tile (no hover: the tile states the numbers) */
export const Sparkline: React.FC<{ values: readonly number[]; label: string }> = ({ values, label }) => {
  if (values.length < 2) return null;
  const w = 100;
  const h = 28;
  const pad = 4;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (values.length - 1);
  const y = (v: number) => h - pad - (v / RATING_MAX) * (h - 2 * pad);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="none">
      <polygon className="sparkline-area" points={`${x(0)},${h - pad} ${points} ${x(last)},${h - pad}`} />
      <polyline className="sparkline-line" points={points} vectorEffect="non-scaling-stroke" />
      <circle className="sparkline-dot" cx={x(last)} cy={y(values[last])} r="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/** Columns for the last sessions, the current one in the accent color */
export const RatingBars: React.FC<{
  values: readonly number[];
  label: string;
  /** Tooltip / screen-reader text for a bar */
  describe: (value: number, index: number) => string;
}> = ({ values, label, describe }) => {
  const [active, setActive] = useState<number | null>(null);
  if (values.length === 0) return null;
  const h = 80;
  const slot = 28;
  const bar = 20;
  const w = values.length * slot;
  const current = values.length - 1;
  return (
    <figure className="rating-bars">
      <figcaption>{label}</figcaption>
      <div className="rating-bars-plot" onPointerLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: Math.min(w * 1.6, 320) }} role="list">
          <line className="chart-baseline" x1="0" x2={w} y1={h - 0.5} y2={h - 0.5} />
          {values.map((v, i) => {
            const bh = Math.max(2, (v / RATING_MAX) * (h - 4));
            const x = i * slot + (slot - bar) / 2;
            const y = h - bh;
            const rr = Math.min(4, bh);
            // rounded data end, square at the baseline
            const d = `M${x},${h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + bar - rr} Q${x + bar},${y} ${x + bar},${y + rr} V${h} Z`;
            return (
              <g
                key={i}
                role="listitem"
                aria-label={describe(v, i)}
                tabIndex={0}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
              >
                {/* hit target taller and wider than the mark */}
                <rect x={i * slot} y="0" width={slot} height={h} fill="transparent" />
                <path className={i === current ? 'bar bar-current' : 'bar'} d={d} />
              </g>
            );
          })}
        </svg>
        {active !== null && (
          <div className="chart-tooltip" style={{ left: `${((active + 0.5) / values.length) * 100}%` }} role="status">
            {describe(values[active], active)}
          </div>
        )}
      </div>
    </figure>
  );
};

/** Horizontal bars with the value at the tip (category index) */
export const HorizontalBars: React.FC<{ rows: readonly { key: string; label: string; value: number }[]; max?: number }> = ({
  rows, max = RATING_MAX,
}) => (
  <div className="hbars">
    {rows.map(row => (
      <div className="hbars-row" key={row.key}>
        <div className="hbars-label">{row.label}</div>
        <div className="hbars-track">
          <div className="hbars-bar" style={{ width: `${Math.max(row.value > 0 ? 1 : 0, (row.value / max) * 100)}%` }} />
          <span className="hbars-value">{row.value}</span>
        </div>
      </div>
    ))}
  </div>
);

export interface RatingPoint {
  /** epoch ms */
  at: number;
  value: number;
  label: string;
}

/**
 * Ratings over time: one dot per session plus a line through the daily
 * averages. One y-axis (0–1000); hover/tap the plot for the nearest session.
 */
export const RatingTimeline: React.FC<{
  sessions: readonly RatingPoint[];
  daily: readonly RatingPoint[];
  legend: { sessions: string; daily: string };
  emptyText: string;
}> = ({ sessions, daily, legend, emptyText }) => {
  const [active, setActive] = useState<number | null>(null);
  if (sessions.length === 0) return <p className="chart-empty">{emptyText}</p>;
  const w = 320;
  const h = 160;
  const left = 34;
  const right = 10;
  const top = 10;
  const bottom = 18;
  const t0 = Math.min(...sessions.map(s => s.at));
  const t1 = Math.max(...sessions.map(s => s.at));
  const span = Math.max(1, t1 - t0);
  const x = (t: number) => (sessions.length === 1 ? (left + w - right) / 2 : left + ((t - t0) / span) * (w - left - right));
  const y = (v: number) => top + (1 - v / RATING_MAX) * (h - top - bottom);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * w;
    let best = 0;
    sessions.forEach((s, i) => {
      if (Math.abs(x(s.at) - px) < Math.abs(x(sessions[best].at) - px)) best = i;
    });
    setActive(best);
  };

  const point = active !== null ? sessions[active] : null;
  return (
    <figure className="rating-timeline">
      <div className="chart-legend">
        <span><i className="legend-dot" /> {legend.sessions}</span>
        {daily.length > 1 && <span><i className="legend-line" /> {legend.daily}</span>}
      </div>
      <div className="rating-timeline-plot">
        <svg viewBox={`0 0 ${w} ${h}`} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setActive(null)}>
          {[0, 500, 1000].map(v => (
            <g key={v}>
              <line className="chart-grid" x1={left} x2={w - right} y1={y(v)} y2={y(v)} />
              <text className="chart-tick" x={left - 6} y={y(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
          {daily.length > 1 && (
            <polyline className="timeline-line" points={daily.map(d => `${x(d.at)},${y(d.value)}`).join(' ')} />
          )}
          {point && <line className="chart-crosshair" x1={x(point.at)} x2={x(point.at)} y1={top} y2={h - bottom} />}
          {sessions.map((s, i) => (
            <circle key={i} className={i === active ? 'timeline-dot active' : 'timeline-dot'} cx={x(s.at)} cy={y(s.value)} r="4" />
          ))}
        </svg>
        {point && (
          <div className="chart-tooltip" style={{ left: `${(x(point.at) / w) * 100}%` }} role="status">
            {point.label}
          </div>
        )}
      </div>
    </figure>
  );
};

export interface CalendarCell {
  date: string;
  sessions: number;
  isToday: boolean;
  label: string;
}

/** Four Monday-first weeks; darker green = more sessions that day */
export const ActivityCalendar: React.FC<{ days: readonly CalendarCell[]; weekdays: readonly string[]; caption: string }> = ({
  days, weekdays, caption,
}) => {
  const [active, setActive] = useState<number | null>(null);
  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
  return (
    <figure className="activity-calendar">
      <figcaption>{caption}</figcaption>
      <div className="calendar-grid" role="grid" onPointerLeave={() => setActive(null)}>
        {weekdays.map(d => <div key={d} className="calendar-weekday" role="columnheader">{d}</div>)}
        {days.map((day, i) => (
          <div
            key={day.date}
            role="gridcell"
            tabIndex={0}
            aria-label={day.label}
            className={`calendar-day level-${level(day.sessions)}${day.isToday ? ' today' : ''}`}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
      <p className="calendar-detail" role="status">{active !== null ? days[active].label : ' '}</p>
    </figure>
  );
};
