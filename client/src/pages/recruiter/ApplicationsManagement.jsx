import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { Pagination } from '../../components/Pagination';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconSearch, IconEye, IconAward, IconCheck } from '../../components/Icons';

export const ApplicationsManagement = () => {
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedJob, setSelectedJob] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [page, setPage] = useState(1);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 10,
        ...(selectedJob && { jobId: selectedJob }),
        ...(statusFilter && { status: statusFilter }),
        ...(minScore && { minScore }),
      }).toString();

      const res = await api.getApplications(query);
      if (res.success) {
        setApplications(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch all jobs for filter dropdown
    api.getJobs('limit=50').then((res) => {
      if (res.success) setJobs(res.data);
    });
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [page, selectedJob, statusFilter, minScore]);

  const handleQuickShortlist = async (appId) => {
    try {
      await api.updateApplicationStatus(appId, { status: 'Shortlisted' });
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to shortlist candidate');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Applications & Screening Center
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Review candidate applications, deterministic match scores, and progress candidate workflows
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div className="filter-group">
          <select
            className="form-control"
            style={{ width: 220 }}
            value={selectedJob}
            onChange={(e) => {
              setSelectedJob(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Job Positions</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title}
              </option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Applied">Applied (New)</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Interview Completed">Interview Completed</option>
            <option value="Selected">Selected / Hired</option>
            <option value="Hold">Hold</option>
            <option value="Rejected">Rejected</option>
          </select>

          <input
            type="number"
            min="0"
            max="100"
            className="form-control"
            style={{ width: 140 }}
            placeholder="Min Score %"
            value={minScore}
            onChange={(e) => {
              setMinScore(e.target.value);
              setPage(1);
            }}
          />

          {(selectedJob || statusFilter || minScore) && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSelectedJob('');
                setStatusFilter('');
                setMinScore('');
                setPage(1);
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Applications Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner text="Loading applications..." />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Requisition</th>
                  <th>Match Score</th>
                  <th>Skills Matched</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--slate-400)' }}>
                      No applications found matching current criteria
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
                          {app.candidateId?.email} • {app.candidateId?.experience || 0} yrs exp
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
                          {app.jobId?.title || 'Job'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                          {app.jobId?.location}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.95rem',
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220 }}>
                          {(app.candidateId?.skills || []).slice(0, 3).map((s) => (
                            <span
                              key={s}
                              style={{
                                padding: '2px 5px',
                                background: 'var(--slate-100)',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                              }}
                            >
                              {s}
                            </span>
                          ))}
                          {(app.candidateId?.skills || []).length > 3 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>
                              +{(app.candidateId?.skills || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge status={app.applicationStatus} />
                      </td>
                      <td>{new Date(app.appliedDate).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Link
                            to={`/recruiter/applications/${app._id}`}
                            className="btn btn-outline btn-sm"
                            title="Review Details"
                          >
                            <IconEye size={14} /> Review
                          </Link>
                          {app.applicationStatus === 'Applied' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleQuickShortlist(app._id)}
                              title="Shortlist Candidate"
                            >
                              <IconCheck size={14} /> Shortlist
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

      <Pagination pagination={pagination} onPageChange={setPage} />
    </div>
  );
};
