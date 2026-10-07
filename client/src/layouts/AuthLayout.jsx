import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const AuthLayout = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (isAuthenticated && user) {
    if (user.role === 'recruiter') return <Navigate to="/recruiter/dashboard" replace />;
    if (user.role === 'interviewer') return <Navigate to="/interviewer/dashboard" replace />;
    return <Navigate to="/candidate/dashboard" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--slate-900)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          padding: '36px 32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '10px 16px',
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '-0.02em',
              marginBottom: 12,
            }}
          >
            SIMS Enterprise
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Smart Interview System
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)', marginTop: 4 }}>
            Local Recruitment & Candidate Lifecycle Platform
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
