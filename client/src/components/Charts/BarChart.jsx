import React from 'react';

export const BarChart = ({ data = [], labelKey = 'label', valueKey = 'value', height = 240 }) => {
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--slate-400)', padding: 16 }}>No data available for chart</div>;
  }

  const maxVal = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  const barWidth = 36;
  const chartPadding = 40;
  const width = Math.max(400, data.length * 60 + chartPadding * 2);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', minWidth: width, height, overflow: 'visible' }}
      >
        {/* Baseline grid */}
        <line
          x1={chartPadding}
          y1={height - 30}
          x2={width - chartPadding}
          y2={height - 30}
          stroke="var(--slate-200)"
          strokeWidth="1"
        />

        {data.map((item, idx) => {
          const val = item[valueKey] || 0;
          const barHeight = Math.max(4, ((val / maxVal) * (height - 70)));
          const x = chartPadding + idx * ((width - chartPadding * 2) / data.length) + 10;
          const y = height - 30 - barHeight;

          return (
            <g key={idx}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill="var(--primary)"
                opacity="0.9"
                style={{ transition: 'all 0.3s ease' }}
              />
              {/* Value text above bar */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="var(--slate-700)"
              >
                {val}
              </text>
              {/* Category label below */}
              <text
                x={x + barWidth / 2}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fontWeight="500"
                fill="var(--slate-500)"
              >
                {String(item[labelKey]).length > 10
                  ? `${String(item[labelKey]).slice(0, 9)}…`
                  : item[labelKey]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
