import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconCheck, IconClock, IconFileText } from '../../components/Icons';

export const CandidateApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getApplications('limit=50')
      .then((res) => {
        if (res.success) setApplications(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const stages = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Interview Completed', 'Selected'];

  const getStepStatus = (currentStatus, step) => {
    const currentIndex = stages.indexOf(currentStatus);
    const stepIndex = stages.indexOf(step);

    if (currentStatus === 'Rejected') return step === 'Applied' ? 'done' : 'inactive';
    if (currentStatus === 'Hold') return stepIndex <= 1 ? 'done' : 'inactive';

    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'active';
    return 'inactive';
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            My Job Applications & Timeline
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Track the real-time progression of your submitted job applications through the hiring lifecycle
          </p>
        </div>
        <Link to="/candidate/jobs" className="btn btn-primary">
          Browse More Jobs
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading applications timeline..." />
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--slate-400)' }}>
          You have not applied for any roles yet.{' '}
          <Link to="/candidate/jobs" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Find open positions
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {applications.map((app) => (
            <div key={app._id} className="card">
              <div className="card-header">
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    {app.jobId?.title || 'Job Requisition'}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginTop: 2 }}>
                    {app.jobId?.location} • Applied on {new Date(app.appliedDate).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--slate-400)' }}>Automated Match</div>
                    <strong
                      style={{
                        fontSize: '1rem',
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
                  </div>
                  <Badge status={app.applicationStatus} />
                </div>
              </div>

              {/* Lifecycle Progress Pipeline */}
              <div style={{ margin: '14px 0' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                  Hiring Lifecycle Pipeline:
                </span>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 10,
                    position: 'relative',
                  }}
                >
                  {stages.map((stage, idx) => {
                    const statusState = getStepStatus(app.applicationStatus, stage);

                    return (
                      <div
                        key={stage}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flex: 1,
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor:
                              statusState === 'done'
                                ? 'var(--success)'
                                : statusState === 'active'
                                ? 'var(--primary)'
                                : 'var(--slate-100)',
                            color: statusState !== 'inactive' ? '#fff' : 'var(--slate-400)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: `2px solid ${
                              statusState === 'done'
                                ? 'var(--success)'
                                : statusState === 'active'
                                ? 'var(--primary)'
                                : 'var(--slate-300)'
                            }`,
                            zIndex: 2,
                          }}
                        >
                          {statusState === 'done' ? '✓' : idx + 1}
                        </div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: statusState === 'active' ? 700 : 500,
                            color:
                              statusState === 'active'
                                ? 'var(--primary)'
                                : statusState === 'done'
                                ? 'var(--slate-800)'
                                : 'var(--slate-400)',
                            marginTop: 6,
                            textAlign: 'center',
                          }}
                        >
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {app.applicationStatus === 'Rejected' && app.rejectionReason && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    backgroundColor: 'var(--danger-light)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--danger-border)',
                    fontSize: '0.82rem',
                    color: 'var(--danger-hover)',
                  }}
                >
                  <strong>Recruiter Feedback:</strong> {app.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
