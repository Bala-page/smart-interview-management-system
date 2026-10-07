import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Modal } from '../../components/Modal';
import { IconCheck, IconX, IconClock, IconEye } from '../../components/Icons';

export const HiringDecisions = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Decision Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    appId: null,
    candidateName: '',
    jobTitle: '',
    targetStatus: '',
    rejectionReason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.getApplications('limit=50');
      if (res.success) {
        setApplications(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const openDecisionModal = (app, status) => {
    setModalState({
      isOpen: true,
      appId: app._id,
      candidateName: app.candidateId?.name || 'Candidate',
      jobTitle: app.jobId?.title || 'Job',
      targetStatus: status,
      rejectionReason: '',
    });
  };

  const handleConfirmDecision = async () => {
    setSubmitting(true);
    try {
      await api.updateApplicationStatus(modalState.appId, {
        status: modalState.targetStatus,
        rejectionReason: modalState.rejectionReason,
      });
      setModalState({ ...modalState, isOpen: false });
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to update decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Hiring Decision Management Center
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Review interview ratings and finalize final hiring offers, holds, or rejections
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner text="Loading candidate decision roster..." />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Requisition</th>
                  <th>Screening Score</th>
                  <th>Current Status</th>
                  <th>Decision Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--slate-400)' }}>
                      No applications on file
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                          {app.candidateId?.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                          {app.candidateId?.email}
                        </div>
                      </td>
                      <td>{app.jobId?.title}</td>
                      <td>
                        <strong
                          style={{
                            color:
                              app.screeningScore >= 70
                                ? 'var(--success)'
                                : app.screeningScore >= 50
                                ? 'var(--warning)'
                                : 'var(--danger)',
                          }}
                        >
                          {app.screeningScore}%
                        </strong>
                      </td>
                      <td>
                        <Badge status={app.applicationStatus} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Link
                            to={`/recruiter/applications/${app._id}`}
                            className="btn btn-outline btn-sm"
                            title="Inspect Profile"
                          >
                            <IconEye size={14} /> Review
                          </Link>

                          {app.applicationStatus !== 'Selected' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => openDecisionModal(app, 'Selected')}
                            >
                              <IconCheck size={14} /> Select
                            </button>
                          )}

                          {app.applicationStatus !== 'Hold' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openDecisionModal(app, 'Hold')}
                            >
                              <IconClock size={14} /> Hold
                            </button>
                          )}

                          {app.applicationStatus !== 'Rejected' && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => openDecisionModal(app, 'Rejected')}
                            >
                              <IconX size={14} /> Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={`Finalize Decision: ${modalState.targetStatus}`}
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
              onClick={handleConfirmDecision}
              disabled={submitting}
            >
              {submitting ? 'Applying...' : `Confirm ${modalState.targetStatus}`}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: 14 }}>
          Confirm transition of candidate <strong>{modalState.candidateName}</strong> on position{' '}
          <strong>{modalState.jobTitle}</strong> to status: <strong style={{ color: 'var(--primary)' }}>{modalState.targetStatus}</strong>.
        </p>
        {modalState.targetStatus === 'Rejected' && (
          <div className="form-group">
            <label className="form-label">Reason for Rejection (Optional):</label>
            <textarea
              className="form-control"
              rows="3"
              value={modalState.rejectionReason}
              onChange={(e) => setModalState({ ...modalState, rejectionReason: e.target.value })}
              placeholder="Feedback note..."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
