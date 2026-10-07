import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { ScoreGauge } from '../../components/Charts/ScoreGauge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Modal } from '../../components/Modal';
import {
  IconCalendar,
  IconAward,
  IconCheck,
  IconX,
  IconClock,
  IconFileText,
  IconMapPin,
} from '../../components/Icons';

export const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Decision Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    targetStatus: '',
    rejectionReason: '',
  });

  const fetchApplication = async () => {
    try {
      const res = await api.getApplicationById(id);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const handleRecalculateScreening = async () => {
    try {
      setActionLoading(true);
      await api.runScreening(id);
      await fetchApplication();
    } catch (err) {
      alert(err.message || 'Failed to re-calculate screening');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmStatus = async () => {
    try {
      setActionLoading(true);
      await api.updateApplicationStatus(id, {
        status: modalState.targetStatus,
        rejectionReason: modalState.rejectionReason,
      });
      setModalState({ isOpen: false, targetStatus: '', rejectionReason: '' });
      await fetchApplication();
    } catch (err) {
      alert(err.message || 'Failed to transition status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading candidate application file..." />;
  if (error || !data) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>{error || 'Application not found'}</p>
        <Link to="/recruiter/applications" className="btn btn-secondary" style={{ marginTop: 12 }}>
          Back to Applications
        </Link>
      </div>
    );
  }

  const { application, screeningResult, interviews } = data;
  const candidate = application.candidateId || {};
  const job = application.jobId || {};

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Header */}
      <div className="toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {candidate.name}
            </h2>
            <Badge status={application.applicationStatus} />
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)', marginTop: 4 }}>
            Application for <strong>{job.title}</strong> • Applied on {new Date(application.appliedDate).toLocaleDateString()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/recruiter/applications" className="btn btn-outline btn-sm">
            Back to List
          </Link>
          <Link
            to={`/recruiter/interviews?candidateId=${candidate._id}&jobId=${job._id}&appId=${application._id}`}
            className="btn btn-primary btn-sm"
          >
            <IconCalendar size={15} /> Schedule Interview
          </Link>
        </div>
      </div>

      {/* Grid: Left Candidate & Resume / Right Screening Result */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Candidate Profile Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Candidate Profile</h3>
            {candidate.resumeFileId && (
              <a
                href={api.getResumeUrl(candidate.resumeFileId)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <IconFileText size={15} /> View Resume PDF
              </a>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.78rem' }}>Email</span>
              <strong>{candidate.email}</strong>
            </div>

            {candidate.phone && (
              <div>
                <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.78rem' }}>Phone</span>
                <strong>{candidate.phone}</strong>
              </div>
            )}

            <div>
              <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.78rem' }}>Location</span>
              <span>{candidate.location || 'Not specified'}</span>
            </div>

            <div>
              <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.78rem' }}>Experience</span>
              <strong>{candidate.experience || 0} years</strong>
            </div>

            <div>
              <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.78rem', marginBottom: 4 }}>
                Candidate Skills
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(candidate.skills || []).map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: '3px 8px',
                      backgroundColor: 'var(--slate-100)',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {candidate.bio && (
              <div style={{ marginTop: 6 }}>
                <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.78rem' }}>Bio / Summary</span>
                <p style={{ color: 'var(--slate-600)', marginTop: 2 }}>{candidate.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Screening Result & Explainability Engine Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Deterministic Screening Evaluation</h3>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleRecalculateScreening}
              disabled={actionLoading}
            >
              Re-run Scoring
            </button>
          </div>

          {screeningResult ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
                <ScoreGauge score={screeningResult.overallMatchScore} size={96} label="Overall Fit" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    {screeningResult.overallMatchScore >= 70
                      ? 'High Candidate Alignment'
                      : screeningResult.overallMatchScore >= 50
                      ? 'Moderate Candidate Alignment'
                      : 'Low Alignment with Job'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 4 }}>
                    Screening Status: <strong>{screeningResult.screeningStatus}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 2 }}>
                    Skill Match: <strong>{screeningResult.skillMatchPercentage}%</strong> • Experience Score: <strong>{screeningResult.experienceScore}%</strong>
                  </div>
                </div>
              </div>

              {/* Matched & Missing Skills Breakdown */}
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>
                  Matched Required Skills ({screeningResult.matchedSkills?.length || 0}):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {screeningResult.matchedSkills?.length === 0 ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>None matched</span>
                  ) : (
                    screeningResult.matchedSkills?.map((s) => (
                      <span
                        key={s}
                        style={{
                          padding: '2px 8px',
                          background: 'var(--success-light)',
                          color: 'var(--success-hover)',
                          border: '1px solid var(--success-border)',
                          borderRadius: 4,
                          fontSize: '0.74rem',
                          fontWeight: 600,
                        }}
                      >
                        ✓ {s}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)' }}>
                  Missing Required Skills ({screeningResult.missingSkills?.length || 0}):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {screeningResult.missingSkills?.length === 0 ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                      All required skills present!
                    </span>
                  ) : (
                    screeningResult.missingSkills?.map((s) => (
                      <span
                        key={s}
                        style={{
                          padding: '2px 8px',
                          background: 'var(--danger-light)',
                          color: 'var(--danger-hover)',
                          border: '1px solid var(--danger-border)',
                          borderRadius: 4,
                          fontSize: '0.74rem',
                          fontWeight: 600,
                        }}
                      >
                        ✗ {s}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Transparent Algorithm Explanation */}
              {screeningResult.scoreBreakdown && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)',
                    fontSize: '0.78rem',
                    color: 'var(--slate-600)',
                  }}
                >
                  <strong>Scoring Formula:</strong> {screeningResult.scoreBreakdown.skillsWeight}% Skills Match +{' '}
                  {screeningResult.scoreBreakdown.experienceWeight}% Experience +{' '}
                  {screeningResult.scoreBreakdown.profileWeight}% Profile Completeness.
                  <div style={{ marginTop: 4 }}>{screeningResult.scoreBreakdown.notes}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--slate-400)', padding: 24, textAlign: 'center' }}>
              Screening calculation pending.
            </div>
          )}
        </div>
      </div>

      {/* Interview & Feedback Records */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Interviews & Evaluator Feedback</h3>
          <Link
            to={`/recruiter/interviews?candidateId=${candidate._id}&jobId=${job._id}&appId=${application._id}`}
            className="btn btn-outline btn-sm"
          >
            <IconCalendar size={14} /> Schedule Interview
          </Link>
        </div>

        {interviews?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate-400)', fontSize: '0.88rem' }}>
            No interview sessions have been conducted or scheduled yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {interviews.map((item) => (
              <div
                key={item._id}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--slate-900)' }}>
                      {item.interviewType} Interview
                    </strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      Interviewer: <strong>{item.interviewerId?.name}</strong> • Date: {item.interviewDate} ({item.startTime} - {item.endTime})
                    </div>
                  </div>
                  <Badge status={item.status} />
                </div>

                <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--slate-600)' }}>
                  Location / Meeting Link: <a href={item.locationOrMeetingInfo} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{item.locationOrMeetingInfo}</a>
                </div>

                {item.notes && (
                  <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                    Notes: {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recruiter Hiring Action Center */}
      <div className="card" style={{ borderColor: 'var(--primary-border)', backgroundColor: 'var(--primary-light)' }}>
        <div className="card-header" style={{ borderBottomColor: 'var(--primary-border)' }}>
          <h3 className="card-title" style={{ color: 'var(--slate-900)' }}>
            Hiring Decision Management Center
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--slate-600)' }}>
            Current Status: <strong>{application.applicationStatus}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {application.applicationStatus !== 'Shortlisted' && (
            <button
              className="btn btn-primary"
              onClick={() => setModalState({ isOpen: true, targetStatus: 'Shortlisted', rejectionReason: '' })}
            >
              <IconCheck size={16} /> Shortlist Candidate
            </button>
          )}

          {application.applicationStatus !== 'Selected' && (
            <button
              className="btn btn-success"
              onClick={() => setModalState({ isOpen: true, targetStatus: 'Selected', rejectionReason: '' })}
            >
              <IconAward size={16} /> Select Candidate (Offer)
            </button>
          )}

          {application.applicationStatus !== 'Hold' && (
            <button
              className="btn btn-outline"
              style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
              onClick={() => setModalState({ isOpen: true, targetStatus: 'Hold', rejectionReason: '' })}
            >
              <IconClock size={16} /> Put on Hold
            </button>
          )}

          {application.applicationStatus !== 'Rejected' && (
            <button
              className="btn btn-danger"
              onClick={() => setModalState({ isOpen: true, targetStatus: 'Rejected', rejectionReason: '' })}
            >
              <IconX size={16} /> Reject Application
            </button>
          )}
        </div>
      </div>

      {/* Decision Confirmation Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={`Confirm Status Transition: ${modalState.targetStatus}`}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setModalState({ ...modalState, isOpen: false })}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmStatus}
              disabled={actionLoading}
            >
              {actionLoading ? 'Updating...' : `Confirm ${modalState.targetStatus}`}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: 16 }}>
          Are you sure you want to transition <strong>{candidate.name}</strong>'s application for{' '}
          <strong>{job.title}</strong> to status: <strong style={{ color: 'var(--primary)' }}>{modalState.targetStatus}</strong>?
        </p>

        {modalState.targetStatus === 'Rejected' && (
          <div className="form-group">
            <label className="form-label">Rejection Reason (Optional):</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="e.g. Missing core backend microservices experience..."
              value={modalState.rejectionReason}
              onChange={(e) => setModalState({ ...modalState, rejectionReason: e.target.value })}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
