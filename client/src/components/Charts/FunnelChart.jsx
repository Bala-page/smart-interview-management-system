import React from 'react';

export const FunnelChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--slate-400)', padding: 16 }}>No funnel data available</div>;
  }

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  // Modern corporate color palette for stages
  const stageColors = [
    '#2563eb', // Applications
    '#0284c7', // Screened
    '#7c3aed', // Shortlisted
    '#d97706', // Interview Scheduled
    '#059669', // Interview Completed
    '#10b981', // Selected
    '#f59e0b', // Hold
    '#ef4444', // Rejected
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map((item, idx) => {
        const pct = Math.max(8, Math.round((item.count / maxVal) * 100));
        const color = stageColors[idx % stageColors.length];

        return (
          <div key={item.stage} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: 'var(--slate-700)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: color,
                    display: 'inline-block',
                  }}
                />
                {item.stage}
              </span>
              <span style={{ color: 'var(--slate-900)' }}>
                <strong>{item.count}</strong>
                {maxVal > 0 && (
                  <span style={{ color: 'var(--slate-400)', fontWeight: 400, marginLeft: 6 }}>
                    ({Math.round((item.count / maxVal) * 100)}%)
                  </span>
                )}
              </span>
            </div>

            {/* Visual Bar */}
            <div
              style={{
                height: 28,
                backgroundColor: 'var(--slate-100)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: color,
                  borderRadius: 'var(--radius-md)',
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 12,
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {item.count > 0 && `${item.count}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
