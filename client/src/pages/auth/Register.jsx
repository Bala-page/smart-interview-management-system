import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { api } from '../../services/api';
import { loginSuccess } from '../../store/authSlice';

export const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    skills: '',
    experience: 0,
    bio: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const skillsArray = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.register({
        ...formData,
        skills: skillsArray,
        role: 'candidate',
      });

      if (res.success) {
        dispatch(loginSuccess(res.data));
        navigate('/candidate/dashboard');
      }
    } catch (err) {
      setError(err.response?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 6, color: 'var(--slate-800)' }}>
        Candidate Registration
      </h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginBottom: 18 }}>
        Create your candidate profile to apply for open engineering roles
      </p>

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
          <label className="form-label">Full Name *</label>
          <input
            type="text"
            required
            name="name"
            className="form-control"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Alex Mercer"
          />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              placeholder="alex@domain.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password * (min 6 chars)</label>
            <input
              type="password"
              required
              minLength={6}
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              name="phone"
              className="form-control"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1-555-0192"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              name="location"
              className="form-control"
              value={formData.location}
              onChange={handleChange}
              placeholder="San Francisco, CA"
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Key Skills (comma separated)</label>
            <input
              type="text"
              name="skills"
              className="form-control"
              value={formData.skills}
              onChange={handleChange}
              placeholder="React, Node.js, MongoDB, JavaScript"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Years of Experience</label>
            <input
              type="number"
              min="0"
              max="50"
              name="experience"
              className="form-control"
              value={formData.experience}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Professional Summary / Bio</label>
          <textarea
            name="bio"
            rows="2"
            className="form-control"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Brief introduction about your technical background..."
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '11px', marginTop: 8 }}
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Complete Registration'}
        </button>
      </form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.86rem', color: 'var(--slate-600)' }}>
        Already registered?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Sign In
        </Link>
      </div>
    </div>
  );
};
