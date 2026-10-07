import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { FunnelChart } from '../../components/Charts/FunnelChart';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  IconBriefcase,
  IconUsers,
  IconCalendar,
  IconAward,
  IconClock,
  IconPlus,
} from '../../components/Icons';

export const RecruiterDashboard = () => {
  const [data, setData] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, funnelRes] = await Promise.all([
          api.getRecruiterDashboard(),
          api.getHiringFunnel(),
        ]);
        if (dashRes.success) setData(dashRes.data);
        if (funnelRes.success) setFunnel(funnelRes.data);
      } catch (err) {
        console.error('Failed to load recruiter dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner text="Loading recruiter dashboard..." />;

  const kpis = data?.kpis || {};

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Recruitment Command Center
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Real-time pipeline metrics, screening results, and interview schedules
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/recruiter/jobs/create" className="btn btn-primary btn-sm">
            <IconPlus size={16} /> Post New Job
          </Link>
          <Link to="/recruiter/applications" className="btn btn-secondary btn-sm">
            View Applications
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <StatCard
          label="Total Jobs"
          value={kpis.totalJobs || 0}
          subtext={`${kpis.openJobs || 0} Open / Published`}
          icon={<IconBriefcase size={18} />}
        />
        <StatCard
          label="Total Applications"
          value={kpis.totalApplications || 0}
          subtext={`${kpis.pendingDecisions || 0} Pending decisions`}
          icon={<IconUsers size={18} />}
        />
        <StatCard
          label="Shortlisted"
          value={kpis.shortlistedCandidates || 0}
          subtext="Ready for interview"
          icon={<IconAward size={18} />}
          color="var(--purple)"
        />
        <StatCard
          label="Scheduled Interviews"
          value={kpis.scheduledInterviews || 0}
          subtext="Upcoming sessions"
          icon={<IconCalendar size={18} />}
          color="var(--info)"
        />
        <StatCard
          label="Selected Candidates"
          value={kpis.selectedCandidates || 0}
          subtext="Offers / Hired"
          icon={<IconAward size={18} />}
          color="var(--success)"
        />
        <StatCard
          label="Rejected"
          value={kpis.rejectedCandidates || 0}
          subtext="Archived candidates"
          icon={<IconClock size={18} />}
          color="var(--danger)"
        />
      </div>

      {/* 2 Column Section: Funnel & Recent Applications */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Hiring Funnel Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Hiring Funnel Progression</h3>
            <Link to="/recruiter/reports" className="btn btn-outline btn-sm">
              Detailed Analytics
            </Link>
          </div>
          <FunnelChart data={funnel} />
        </div>

        {/* Upcoming Interviews & Pending Feedback */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Interviews</h3>
            <Link to="/recruiter/interviews" className="btn btn-outline btn-sm">
              All Schedules
            </Link>
          </div>
          {data?.upcomingInterviews?.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', padding: 24, textAlign: 'center' }}>
              No upcoming interviews scheduled
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.upcomingInterviews?.map((interview) => (
                <div
                  key={interview._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--border-color-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                      {interview.candidateId?.name || 'Candidate'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                      Role: {interview.jobId?.title} • Interviewer: {interview.interviewerId?.name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {interview.interviewDate}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      {interview.startTime} - {interview.endTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Applications</h3>
          <Link to="/recruiter/applications" className="btn btn-outline btn-sm">
            View All ({kpis.totalApplications || 0})
          </Link>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job Applied</th>
                <th>Screening Score</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentApplications?.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: 'var(--slate-400)' }}>
                    No recent applications found
                  </td>
                </tr>
              ) : (
                data?.recentApplications?.map((app) => (
                  <tr key={app._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-900)' }}>
                        {app.candidateId?.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>
                        {app.candidateId?.email}
                      </div>
                    </td>
                    <td>{app.jobId?.title || 'Job'}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            app.screeningScore >= 70
                              ? 'var(--success)'
                              : app.screeningScore >= 50
                              ? 'var(--warning)'
                              : 'var(--danger)',
                        }}
                      >
                        {app.screeningScore}%
                      </span>
                    </td>
                    <td>
                      <Badge status={app.applicationStatus} />
                    </td>
                    <td>{new Date(app.appliedDate).toLocaleDateString()}</td>
                    <td>
                      <Link
                        to={`/recruiter/applications/${app._id}`}
                        className="btn btn-outline btn-sm"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
