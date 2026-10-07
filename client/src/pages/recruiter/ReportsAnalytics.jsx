import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { FunnelChart } from '../../components/Charts/FunnelChart';
import { StatCard } from '../../components/StatCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Badge } from '../../components/Badge';
import { IconChart, IconAward, IconUsers, IconBriefcase } from '../../components/Icons';

export const ReportsAnalytics = () => {
  const [funnel, setFunnel] = useState([]);
  const [ratios, setRatios] = useState(null);
  const [jobPerformance, setJobPerformance] = useState([]);
  const [interviewerPerformance, setInterviewerPerformance] = useState([]);
  const [candidateRankings, setCandidateRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllReports = async () => {
      try {
        const [funnelRes, ratioRes, jobRes, intvRes, rankRes] = await Promise.all([
          api.getHiringFunnel(),
          api.getSelectionRatio(),
          api.getJobPerformance(),
          api.getInterviewerPerformance(),
          api.getCandidateRanking('limit=10'),
        ]);

        if (funnelRes.success) setFunnel(funnelRes.data);
        if (ratioRes.success) setRatios(ratioRes.data);
        if (jobRes.success) setJobPerformance(jobRes.data);
        if (intvRes.success) setInterviewerPerformance(intvRes.data);
        if (rankRes.success) setCandidateRankings(rankRes.data);
      } catch (err) {
        console.error('Error loading reports:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllReports();
  }, []);

  if (loading) return <LoadingSpinner text="Generating pipeline analytics & aggregation reports..." />;

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Recruitment Reports & Performance Analytics
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Pipeline conversion rates, requisition performance, evaluator metrics, and candidate rankings
          </p>
        </div>
      </div>

      {/* KPI Conversion Ratios */}
      <div className="kpi-grid">
        <StatCard
          label="Selection Ratio"
          value={`${ratios?.selectionRatio || 0}%`}
          subtext={`${ratios?.selectedCandidates || 0} / ${ratios?.totalApplications || 0} total applications`}
          icon={<IconAward size={18} />}
          color="var(--success)"
        />
        <StatCard
          label="Shortlisting Ratio"
          value={`${ratios?.shortlistingRatio || 0}%`}
          subtext={`${ratios?.shortlistedCandidates || 0} candidates shortlisted`}
          icon={<IconUsers size={18} />}
          color="var(--purple)"
        />
        <StatCard
          label="Interview Conversion"
          value={`${ratios?.interviewConversion || 0}%`}
          subtext="Offers from completed interviews"
          icon={<IconChart size={18} />}
          color="var(--primary)"
        />
        <StatCard
          label="Interviews Completed"
          value={ratios?.interviewedCandidates || 0}
          subtext="Total completed evaluations"
          icon={<IconBriefcase size={18} />}
        />
      </div>

      {/* Hiring Funnel Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Hiring Funnel Progression</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
            Local MongoDB Aggregation Pipeline
          </span>
        </div>
        <FunnelChart data={funnel} />
      </div>

      {/* Job-wise Performance */}
      <div className="card" style={{ marginBottom: 24, padding: 0 }}>
        <div className="card-header" style={{ padding: '16px 20px', margin: 0 }}>
          <h3 className="card-title">Requisition Performance Breakdown</h3>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Job Requisition</th>
                <th>Status</th>
                <th>Applications</th>
                <th>Shortlisted</th>
                <th>Interviews</th>
                <th>Selected</th>
                <th>Selection %</th>
              </tr>
            </thead>
            <tbody>
              {jobPerformance.map((job) => (
                <tr key={job.jobId}>
                  <td>
                    <strong>{job.jobTitle}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{job.location}</div>
                  </td>
                  <td>
                    <Badge status={job.status} />
                  </td>
                  <td>{job.applications}</td>
                  <td>{job.shortlisted}</td>
                  <td>{job.interviews}</td>
                  <td>
                    <strong style={{ color: 'var(--success)' }}>{job.selected}</strong>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>{job.selectionPercentage}%</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interviewer Performance Report */}
      <div className="card" style={{ marginBottom: 24, padding: 0 }}>
        <div className="card-header" style={{ padding: '16px 20px', margin: 0 }}>
          <h3 className="card-title">Interviewer Performance & Rating Metrics</h3>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Interviewer</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Feedback Submitted</th>
                <th>Avg Technical</th>
                <th>Avg Communication</th>
                <th>Avg Overall</th>
                <th>Hire Rec %</th>
              </tr>
            </thead>
            <tbody>
              {interviewerPerformance.map((intv) => (
                <tr key={intv.interviewerId}>
                  <td>
                    <strong>{intv.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{intv.email}</div>
                  </td>
                  <td>{intv.interviewsAssigned}</td>
                  <td>{intv.interviewsCompleted}</td>
                  <td>{intv.feedbackSubmitted}</td>
                  <td>{intv.avgTechnicalRating > 0 ? `${intv.avgTechnicalRating} / 5` : 'N/A'}</td>
                  <td>{intv.avgCommunicationRating > 0 ? `${intv.avgCommunicationRating} / 5` : 'N/A'}</td>
                  <td>
                    <strong>{intv.avgOverallRating > 0 ? `${intv.avgOverallRating} / 5` : 'N/A'}</strong>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--success)' }}>{intv.hireRecommendationPercentage}%</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Ranking Leaderboard */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '16px 20px', margin: 0 }}>
          <h3 className="card-title">Candidate Match Ranking Leaderboard</h3>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Target Job</th>
                <th>Deterministic Score</th>
                <th>Skill Match %</th>
                <th>Experience Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {candidateRankings.map((cand, idx) => (
                <tr key={cand._id}>
                  <td>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : 'var(--slate-100)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        color: 'var(--slate-800)',
                      }}
                    >
                      #{idx + 1}
                    </span>
                  </td>
                  <td>
                    <strong>{cand.candidateId?.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{cand.candidateId?.email}</div>
                  </td>
                  <td>{cand.jobId?.title}</td>
                  <td>
                    <strong style={{ fontSize: '1rem', color: 'var(--success)' }}>
                      {cand.overallMatchScore}%
                    </strong>
                  </td>
                  <td>{cand.skillMatchPercentage}%</td>
                  <td>{cand.experienceScore}%</td>
                  <td>
                    <Badge status={cand.applicationId?.applicationStatus || cand.screeningStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
