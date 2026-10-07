import React from 'react';

export const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        color: 'var(--slate-500)',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid var(--slate-200)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{text}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
