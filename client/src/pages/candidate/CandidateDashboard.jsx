import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  IconBriefcase,
  IconClipboardCheck,
  IconCalendar,
  IconAward,
  IconClock,
  IconSearch,
  IconUser,
} from '../../components/Icons';

export const CandidateDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCandidateDashboard()
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading candidate portal..." />;

  const kpis = data?.kpis || {};
  const profileCompletion = data?.profileCompletion || 0;

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Candidate Career Portal
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Track application progression, upcoming interviews, and recommended engineering roles
          </p>
        </div>
        <Link to="/candidate/jobs" className="btn btn-primary">
          <IconSearch size={16} /> Explore Open Positions
        </Link>
      </div>

      {/* Profile Completion Card */}
      <div className="card" style={{ padding: '18px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconUser size={18} />
            <strong style={{ fontSize: '0.95rem', color: 'var(--slate-800)' }}>
              Profile & Resume Readiness
            </strong>
          </div>
          <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{profileCompletion}% Complete</strong>
        </div>

        <div
          style={{
            height: 10,
            backgroundColor: 'var(--slate-100)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${profileCompletion}%`,
              backgroundColor: profileCompletion >= 80 ? 'var(--success)' : 'var(--primary)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>

        {profileCompletion < 100 && (
          <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--slate-500)' }}>
            Tip: Upload a PDF resume and complete your skills to improve your deterministic screening match score.{' '}
            <Link to="/candidate/profile" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Update Profile Now →
            </Link>
          </div>
        )}
      </div>

      {/* KPI Counters */}
      <div className="kpi-grid">
        <StatCard
          label="Applications"
          value={kpis.totalApplications || 0}
          subtext="Total roles applied"
          icon={<IconClipboardCheck size={18} />}
        />
        <StatCard
          label="Shortlisted"
          value={kpis.shortlisted || 0}
          subtext="Cleared initial screening"
          icon={<IconAward size={18} />}
          color="var(--purple)"
        />
        <StatCard
          label="Upcoming Interviews"
          value={kpis.upcomingInterviews || 0}
          subtext="Scheduled live sessions"
          icon={<IconCalendar size={18} />}
          color="var(--info)"
        />
        <StatCard
          label="Offers / Selected"
          value={kpis.selected || 0}
          subtext="Hiring selections"
          icon={<IconAward size={18} />}
          color="var(--success)"
        />
      </div>

      {/* 2 Column: Recent Applications & Upcoming Interviews */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Recent Applications */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Recent Applications</h3>
            <Link to="/candidate/applications" className="btn btn-outline btn-sm">
              View All ({kpis.totalApplications || 0})
            </Link>
          </div>

          {data?.recentApplications?.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--slate-400)' }}>
              You haven't submitted any job applications yet.{' '}
              <Link to="/candidate/jobs" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Browse open jobs
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data?.recentApplications?.map((app) => (
                <div
                  key={app._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--border-color-subtle)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--slate-900)' }}>
                      {app.jobId?.title || 'Job'}
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      Applied on {new Date(app.appliedDate).toLocaleDateString()} • {app.jobId?.location}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <Badge status={app.applicationStatus} />
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: 4 }}>
                      Match Score: <strong>{app.screeningScore}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Interviews */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Interview Sessions</h3>
            <Link to="/candidate/interviews" className="btn btn-outline btn-sm">
              All Sessions
            </Link>
          </div>

          {data?.upcomingInterviews?.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--slate-400)' }}>
              No upcoming interview sessions currently scheduled.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data?.upcomingInterviews?.map((intv) => (
                <div
                  key={intv._id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--border-color-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--slate-900)' }}>
                      {intv.jobId?.title}
                    </strong>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                      {intv.interviewDate}
                    </strong>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: 4 }}>
                    Time: {intv.startTime} - {intv.endTime} • Evaluator: {intv.interviewerId?.name}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <a
                      href={intv.locationOrMeetingInfo}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      Join Session Link
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recommended Open Positions</h3>
          <Link to="/candidate/jobs" className="btn btn-outline btn-sm">
            View All Jobs
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {data?.recommendedJobs?.map((job) => (
            <div
              key={job._id}
              style={{
                padding: 16,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.98rem', color: 'var(--slate-900)' }}>{job.title}</strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 2 }}>
                  {job.location} • {job.employmentType}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                  {(job.requiredSkills || []).slice(0, 4).map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: '2px 6px',
                        background: 'var(--slate-100)',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        color: 'var(--slate-700)',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Link to={`/candidate/jobs/${job._id}`} className="btn btn-secondary btn-sm">
                  View & Apply →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
