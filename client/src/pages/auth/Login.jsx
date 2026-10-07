import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { api } from '../../services/api';
import { loginSuccess } from '../../store/authSlice';

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      if (res.success) {
        dispatch(loginSuccess(res.data));
        const role = res.data.user.role;
        if (role === 'recruiter') navigate('/recruiter/dashboard');
        else if (role === 'interviewer') navigate('/interviewer/dashboard');
        else navigate('/candidate/dashboard');
      }
    } catch (err) {
      setError(err.response?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (testEmail, testPassword) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setError('');
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 18, color: 'var(--slate-800)' }}>
        Sign In to Your Account
      </h3>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger-hover)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--danger-border)',
            fontSize: '0.85rem',
            marginBottom: 18,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            required
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. admin@sims.local"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            required
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '11px', marginTop: 8 }}
          disabled={loading}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      {/* Quick Test Accounts Helper */}
      <div
        style={{
          marginTop: 24,
          padding: 14,
          backgroundColor: 'var(--slate-50)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--slate-200)',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--slate-700)', marginBottom: 8 }}>
          Demo Test Accounts (Click to Fill):
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }}
            onClick={() => handleQuickFill('admin@sims.local', 'Admin@123')}
          >
            <strong>Recruiter:</strong> admin@sims.local
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }}
            onClick={() => handleQuickFill('sarah.interviewer@sims.local', 'Interviewer@123')}
          >
            <strong>Interviewer:</strong> sarah.interviewer@sims.local
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }}
            onClick={() => handleQuickFill('alex.candidate@sims.local', 'Candidate@123')}
          >
            <strong>Candidate:</strong> alex.candidate@sims.local
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.86rem', color: 'var(--slate-600)' }}>
        New Candidate?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Create an Account
        </Link>
      </div>
    </div>
  );
};
