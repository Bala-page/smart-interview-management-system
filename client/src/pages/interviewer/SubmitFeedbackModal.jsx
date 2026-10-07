import React, { useState } from 'react';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';

export const SubmitFeedbackModal = ({ isOpen, onClose, interview, onFeedbackSubmitted }) => {
  const [formData, setFormData] = useState({
    technicalRating: 4,
    communicationRating: 4,
    problemSolvingRating: 4,
    roleKnowledgeRating: 4,
    overallRating: 4,
    recommendation: 'Hire',
    comments: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!interview) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.submitFeedback({
        interviewId: interview._id,
        ...formData,
      });
      onClose();
      if (onFeedbackSubmitted) onFeedbackSubmitted();
    } catch (err) {
      setError(err.response?.message || err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRatingSelect = (label, field) => (
    <div className="form-group" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label className="form-label" style={{ margin: 0 }}>
          {label}
        </label>
        <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
          {formData[field]} / 5
        </strong>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            type="button"
            className={`btn btn-sm ${formData[field] === val ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, padding: '8px 0', fontWeight: 700 }}
            onClick={() => setFormData({ ...formData, [field]: val })}
          >
            {val}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Submit Interview Feedback: ${interview.candidateId?.name || 'Candidate'}`}
      maxWidth={640}
    >
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger-hover)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--danger-border)',
            fontSize: '0.85rem',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16, fontSize: '0.86rem', color: 'var(--slate-600)' }}>
          Position: <strong>{interview.jobId?.title}</strong> • Date: {interview.interviewDate} ({interview.startTime} - {interview.endTime})
        </div>

        {renderRatingSelect('Technical Proficiency (1–5)', 'technicalRating')}
        {renderRatingSelect('Communication & Articulation (1–5)', 'communicationRating')}
        {renderRatingSelect('Problem Solving & Algorithmic Logic (1–5)', 'problemSolvingRating')}
        {renderRatingSelect('Role Knowledge & Architecture (1–5)', 'roleKnowledgeRating')}
        {renderRatingSelect('Overall Interview Rating (1–5)', 'overallRating')}

        <div className="form-group">
          <label className="form-label">Hiring Recommendation *</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {['Hire', 'Hold', 'Reject'].map((rec) => (
              <label
                key={rec}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${
                    formData.recommendation === rec
                      ? rec === 'Hire'
                        ? 'var(--success)'
                        : rec === 'Hold'
                        ? 'var(--warning)'
                        : 'var(--danger)'
                      : 'var(--border-color)'
                  }`,
                  backgroundColor: formData.recommendation === rec ? 'var(--slate-50)' : '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
              >
                <input
                  type="radio"
                  name="recommendation"
                  value={rec}
                  checked={formData.recommendation === rec}
                  onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                />
                {rec}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Qualitative Comments & Feedback * (min 10 chars)</label>
          <textarea
            required
            rows="4"
            className="form-control"
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            placeholder="Describe candidate technical strengths, code quality, gaps, and rationale for your recommendation..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting Feedback...' : 'Submit Final Evaluation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
