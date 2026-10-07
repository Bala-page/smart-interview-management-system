import React from 'react';

export const ScoreGauge = ({ score = 0, size = 100, strokeWidth = 8, label = 'Match Score' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  let color = 'var(--danger)';
  if (clamped >= 70) color = 'var(--success)';
  else if (clamped >= 50) color = 'var(--warning)';

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--slate-200)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: size * 0.26, fontWeight: 800, color: 'var(--slate-900)' }}>
            {clamped}%
          </span>
        </div>
      </div>
      {label && (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: 4 }}>
          {label}
        </span>
      )}
    </div>
  );
};
