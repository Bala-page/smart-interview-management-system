import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  IconClock,
  IconShield,
  IconCheckCircle,
  IconXCircle,
  IconAlertTriangle,
  IconAward,
  IconMaximize,
} from '../../components/Icons';

export const CandidateAssessments = () => {
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Rules modal before start
  const [selectedAttemptToStart, setSelectedAttemptToStart] = useState(null);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getMyAssessments();
      if (res.success) {
        setAssessments(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStart = () => {
    if (!selectedAttemptToStart) return;
    const attemptId = selectedAttemptToStart._id;
    setSelectedAttemptToStart(null);
    navigate(`/candidate/assessments/${attemptId}/take`);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
          My Online Assessments
        </h1>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
          Complete your assigned 15-minute technical skill assessments for applied jobs.
        </p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading your assigned assessments...
        </div>
      ) : assessments.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <IconClock size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', color: '#0f172a', margin: '0 0 6px 0' }}>No Assessments Assigned</h3>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            When recruiters review your job applications and invite you to an assessment, it will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {assessments.map((att) => {
            const isAssigned = att.status === 'Assigned';
            const isInProgress = att.status === 'In Progress';
            const isFinalized = ['Submitted', 'Auto Submitted', 'Terminated', 'Evaluated'].includes(att.status);

            let badgeStyle = { background: '#f1f5f9', color: '#475569' };
            if (isInProgress) badgeStyle = { background: '#e0f2fe', color: '#0369a1' };
            else if (att.passed) badgeStyle = { background: '#dcfce7', color: '#15803d' };
            else if (att.status === 'Terminated') badgeStyle = { background: '#fee2e2', color: '#b91c1c' };
            else if (isFinalized && !att.passed) badgeStyle = { background: '#fef2f2', color: '#991b1b' };

            return (
              <div key={att._id} className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span className="badge" style={{ ...badgeStyle, fontWeight: '700', fontSize: '12px' }}>
                      {att.status === 'Evaluated' ? (att.passed ? 'PASSED' : 'COMPLETED') : att.status}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {att.totalQuestions} Questions
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
                    {att.jobId?.title || 'Job Assessment'}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                    Department: {att.jobId?.department || 'Engineering'} • {att.jobId?.location || 'Remote'}
                  </div>

                  {/* Assessment Info Tags */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#475569', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <IconClock size={15} style={{ color: '#2563eb' }} />
                      <span>Duration: <strong>15 minutes (Strict timer)</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconShield size={15} style={{ color: '#16a34a' }} />
                      <span>Proctored: Fullscreen mode & Tab detection (Max 3 strikes)</span>
                    </div>
                  </div>

                  {/* Result if evaluated */}
                  {isFinalized && att.score !== undefined && (
                    <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: att.passed ? '#f0fdf4' : '#fef2f2', border: `1px solid ${att.passed ? '#bbf7d0' : '#fecaca'}` }}>
                      <div style={{ fontSize: '12px', color: att.passed ? '#166534' : '#991b1b', fontWeight: '600' }}>
                        FINAL RESULT:
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: att.passed ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
                        {att.score} / {att.totalMarks} ({att.percentage}%) — {att.passed ? 'Passed' : 'Not Qualified'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ marginTop: '12px' }}>
                  {isAssigned && (
                    <button
                      onClick={() => setSelectedAttemptToStart(att)}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: '600' }}
                    >
                      Start Assessment
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      onClick={() => navigate(`/candidate/assessments/${att._id}/take`)}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: '600', background: '#d97706', borderColor: '#d97706' }}
                    >
                      Resume Assessment
                    </button>
                  )}

                  {isFinalized && (
                    <button
                      onClick={() => navigate(`/candidate/assessments/${att._id}/result`)}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: '600' }}
                    >
                      View Detailed Result
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rules Confirmation Modal */}
      {selectedAttemptToStart && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card modal-content" style={{ width: '540px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
              Important Assessment Rules & Instructions
            </h2>

            <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', marginBottom: '20px' }}>
              <p>
                You are about to start the <strong>{selectedAttemptToStart.jobId?.title}</strong> Technical Assessment. Please review the mandatory assessment policies below:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Authoritative 15-Minute Countdown:</strong> You have exactly 15 minutes to complete 10 multiple-choice questions. When time expires, your answers will be automatically submitted.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Automatic Answer Saving:</strong> Your selected answers are automatically persisted to the server every 30 seconds and upon each answer selection.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Fullscreen Enforcement:</strong> The test runs in fullscreen mode. Exiting fullscreen mode will trigger a violation warning.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Tab-Switching & Anti-Cheating:</strong> Switching browser tabs, minimizing the browser window, or navigating away records a strike. A maximum of <strong>3 violations</strong> are permitted before your assessment is <strong>instantly terminated and auto-submitted</strong>.
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setSelectedAttemptToStart(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStart}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <IconMaximize size={16} />
                <span>Enter Fullscreen & Begin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CandidateAssessments;
