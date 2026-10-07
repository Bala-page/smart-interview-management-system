import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SubmitFeedbackModal } from './SubmitFeedbackModal';
import { IconCalendar, IconAward, IconClock, IconFileText } from '../../components/Icons';

export const InterviewerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFeedbackInterview, setActiveFeedbackInterview] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.getInterviewerDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner text="Loading interviewer dashboard..." />;

  const kpis = data?.kpis || {};

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Interviewer Workbench
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Manage scheduled technical evaluations, review candidate resumes, and record feedback
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <StatCard
          label="Total Assigned"
          value={kpis.totalAssigned || 0}
          subtext="Assigned interviews"
          icon={<IconCalendar size={18} />}
        />
        <StatCard
          label="Upcoming Sessions"
          value={kpis.upcomingInterviews || 0}
          subtext="Awaiting session"
          icon={<IconClock size={18} />}
          color="var(--info)"
        />
        <StatCard
          label="Pending Feedback"
          value={kpis.pendingFeedbackCount || 0}
          subtext="Action required"
          icon={<IconAward size={18} />}
          color="var(--warning)"
        />
        <StatCard
          label="Completed Feedback"
          value={kpis.completedFeedbackCount || 0}
          subtext="Evaluations filed"
          icon={<IconAward size={18} />}
          color="var(--success)"
        />
      </div>

      {/* Pending Feedback Banner / Alert */}
      {data?.pendingFeedback?.length > 0 && (
        <div
          className="card"
          style={{
            borderColor: 'var(--warning-border)',
            backgroundColor: 'var(--warning-light)',
            marginBottom: 24,
          }}
        >
          <div className="card-header" style={{ borderBottomColor: 'var(--warning-border)' }}>
            <h3 className="card-title" style={{ color: 'var(--warning)' }}>
              Action Required: Pending Interview Feedback ({data.pendingFeedback.length})
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)', marginBottom: 14 }}>
            Please submit your structured evaluation for completed sessions so the recruitment team can proceed with hiring decisions.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.pendingFeedback.map((intv) => (
              <div
                key={intv._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#fff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                    {intv.candidateId?.name} — {intv.jobId?.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    Conducted on {intv.interviewDate} ({intv.startTime} - {intv.endTime})
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveFeedbackInterview(intv)}
                >
                  Submit Evaluation Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Interviews Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Upcoming Interview Sessions</h3>
          <Link to="/interviewer/interviews" className="btn btn-outline btn-sm">
            View All ({kpis.totalAssigned || 0})
          </Link>
        </div>

        {data?.upcomingInterviews?.length === 0 ? (
          <div style={{ color: 'var(--slate-400)', padding: 32, textAlign: 'center' }}>
            No upcoming interview sessions scheduled at this time.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data?.upcomingInterviews?.map((intv) => (
              <div
                key={intv._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--border-color-subtle)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--slate-900)' }}>
                    {intv.candidateId?.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: 2 }}>
                    Role: <strong>{intv.jobId?.title}</strong> • Type: {intv.interviewType}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 2 }}>
                    Meeting URL: <a href={intv.locationOrMeetingInfo} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{intv.locationOrMeetingInfo}</a>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                    {intv.interviewDate}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                    {intv.startTime} - {intv.endTime}
                  </div>
                  {intv.candidateId?.resumeFileId && (
                    <a
                      href={api.getResumeUrl(intv.candidateId.resumeFileId)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: 6 }}
                    >
                      <IconFileText size={14} /> Candidate Resume
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SubmitFeedbackModal
        isOpen={Boolean(activeFeedbackInterview)}
        onClose={() => setActiveFeedbackInterview(null)}
        interview={activeFeedbackInterview}
        onFeedbackSubmitted={fetchDashboard}
      />
    </div>
  );
};
