import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const JobCreateEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requiredSkills: '',
    minimumExperience: 0,
    maximumExperience: '',
    location: 'Remote',
    employmentType: 'Full-time',
    status: 'Draft',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api
        .getJobById(id)
        .then((res) => {
          if (res.success) {
            const j = res.data;
            setFormData({
              title: j.title || '',
              description: j.description || '',
              requiredSkills: (j.requiredSkills || []).join(', '),
              minimumExperience: j.minimumExperience || 0,
              maximumExperience: j.maximumExperience || '',
              location: j.location || 'Remote',
              employmentType: j.employmentType || 'Full-time',
              status: j.status || 'Draft',
            });
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        requiredSkills: formData.requiredSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        minimumExperience: Number(formData.minimumExperience) || 0,
        maximumExperience: formData.maximumExperience ? Number(formData.maximumExperience) : null,
      };

      if (isEdit) {
        await api.updateJob(id, payload);
      } else {
        await api.createJob(payload);
      }
      navigate('/recruiter/jobs');
    } catch (err) {
      setError(err.response?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading job details..." />;

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {isEdit ? 'Edit Job Requisition' : 'Create New Job Requisition'}
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            {isEdit ? 'Update job details and requirements' : 'Define job requirements, skills and experience'}
          </p>
        </div>
        <Link to="/recruiter/jobs" className="btn btn-outline btn-sm">
          Cancel & Return
        </Link>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger-hover)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--danger-border)',
            fontSize: '0.85rem',
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input
              type="text"
              required
              name="title"
              className="form-control"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Senior Full Stack Engineer"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Job Description *</label>
            <textarea
              required
              name="description"
              rows="6"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe role responsibilities, deliverables, and team context..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Required Skills (Comma separated) *</label>
            <input
              type="text"
              required
              name="requiredSkills"
              className="form-control"
              value={formData.requiredSkills}
              onChange={handleChange}
              placeholder="React, Node.js, MongoDB, JavaScript, Express"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: 4, display: 'block' }}>
              These skills will be matched against candidate resumes by the deterministic screening engine.
            </span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Minimum Experience (Years) *</label>
              <input
                type="number"
                min="0"
                required
                name="minimumExperience"
                className="form-control"
                value={formData.minimumExperience}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Maximum Experience (Years)</label>
              <input
                type="number"
                min="0"
                name="maximumExperience"
                className="form-control"
                value={formData.maximumExperience}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Location *</label>
              <input
                type="text"
                required
                name="location"
                className="form-control"
                value={formData.location}
                onChange={handleChange}
                placeholder="Remote or City, State"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Employment Type *</label>
              <select
                name="employmentType"
                className="form-control"
                value={formData.employmentType}
                onChange={handleChange}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Status</label>
            <select
              name="status"
              className="form-control"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Draft">Draft (Hidden from candidates)</option>
              <option value="Open">Open (Live & Accepting Applications)</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Link to="/recruiter/jobs" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update Requisition' : 'Publish / Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
