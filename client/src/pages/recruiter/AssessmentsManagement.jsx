import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import {
  IconSearch,
  IconPlus,
  IconEye,
  IconFilter,
  IconAward,
  IconClock,
  IconAlertTriangle,
  IconRotateCcw,
  IconClipboardCheck,
} from '../../components/Icons';

export const AssessmentsManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [passedFilter, setPassedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal State for Assigning Assessment
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    jobId: '',
    applicationId: '',
    candidateId: '',
    durationMinutes: 15,
    passingPercentage: 60,
    resultVisibility: 'Immediate',
    distribution: { easy: 3, medium: 5, hard: 2 },
  });
  const [assignLoading, setAssignLoading] = useState(false);

  // Initial load: Fetch jobs & check search params for deep linking
  useEffect(() => {
    const initialize = async () => {
      const loadedJobs = await fetchJobs();

      // Check URL parameters for pre-selected job & candidate application
      const paramJobId = searchParams.get('jobId');
      const paramAppId = searchParams.get('appId');
      const paramCandidateId = searchParams.get('candidateId');
      const shouldOpenAssign = searchParams.get('openAssign') === 'true' || Boolean(paramJobId || paramAppId);

      if (shouldOpenAssign) {
        setShowAssignModal(true);

        if (paramJobId) {
          try {
            const res = await api.getApplications(`jobId=${paramJobId}&limit=100`);
            const appsList = Array.isArray(res.data) ? res.data : (res.data?.applications || []);
            setApplications(appsList);

            const matchedApp = appsList.find((a) => a._id === paramAppId) || appsList[0];
            const candidateId = paramCandidateId || matchedApp?.candidateId?._id || matchedApp?.candidateId || '';
            const appId = paramAppId || matchedApp?._id || '';

            setAssignForm((prev) => ({
              ...prev,
              jobId: paramJobId,
              applicationId: appId,
              candidateId: candidateId,
            }));
          } catch (err) {
            console.error('Error preloading applications for assign modal:', err);
          }
        }
      }
    };

    initialize();
  }, [searchParams]);

  useEffect(() => {
    fetchAttempts();
  }, [page, search, selectedJob, selectedStatus, passedFilter]);

  const fetchJobs = async () => {
    try {
      const res = await api.getJobs('limit=100');
      if (res.success) {
        const jobsList = Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
        setJobs(jobsList);
        return jobsList;
      }
      return [];
    } catch (err) {
      console.warn('Failed to load jobs list:', err);
      return [];
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page,
        limit: 15,
        search,
        jobId: selectedJob,
        status: selectedStatus,
        passed: passedFilter,
      });

      const res = await api.getRecruiterAttempts(params.toString());
      if (res.success) {
        setAttempts(res.data.attempts || []);
        setStats(res.data.stats || null);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch assessment attempts');
    } finally {
      setLoading(false);
    }
  };

  // When job is selected in assign modal, fetch eligible applications for that job
  const handleJobSelectForAssign = async (jobId) => {
    setAssignForm((prev) => ({ ...prev, jobId, applicationId: '', candidateId: '' }));
    if (!jobId) {
      setApplications([]);
      return;
    }

    try {
      const res = await api.getApplications(`jobId=${jobId}&limit=100`);
      if (res.success) {
        const appsList = Array.isArray(res.data) ? res.data : (res.data?.applications || []);
        setApplications(appsList);

        // Preselect the first application if available
        if (appsList.length > 0) {
          const firstApp = appsList[0];
          setAssignForm((prev) => ({
            ...prev,
            jobId,
            applicationId: firstApp._id,
            candidateId: firstApp.candidateId?._id || firstApp.candidateId || '',
          }));
        }
      }
    } catch (err) {
      setError('Failed to fetch applications for selected job');
    }
  };

  const handleApplicationSelectForAssign = (appId) => {
    const selectedApp = applications.find((a) => a._id === appId);
    if (selectedApp) {
      setAssignForm((prev) => ({
        ...prev,
        applicationId: appId,
        candidateId: selectedApp.candidateId?._id || selectedApp.candidateId,
      }));
    } else {
      setAssignForm((prev) => ({
        ...prev,
        applicationId: '',
        candidateId: '',
      }));
    }
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    // Clear URL parameters if opened via deep link
    if (searchParams.get('openAssign') || searchParams.get('jobId') || searchParams.get('appId')) {
      setSearchParams({});
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!assignForm.jobId || !assignForm.applicationId || !assignForm.candidateId) {
      setError('Please select both a job and candidate application.');
      return;
    }

    try {
      setAssignLoading(true);
      const res = await api.assignAssessment({
        jobId: assignForm.jobId,
        applicationId: assignForm.applicationId,
        candidateId: assignForm.candidateId,
        durationMinutes: assignForm.durationMinutes,
        passingPercentage: assignForm.passingPercentage,
        resultVisibility: assignForm.resultVisibility,
        questionDistribution: assignForm.distribution,
      });

      if (res.success) {
        setSuccessMsg('Online Assessment successfully assigned to candidate!');
        handleCloseAssignModal();
        fetchAttempts();
      }
    } catch (err) {
      setError(err.message || 'Failed to assign assessment');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAuthorizeRetake = async (attemptId) => {
    if (!window.confirm('Are you sure you want to authorize a fresh retake for this candidate? Their attempt will be reset with a new randomized set of 10 questions.')) {
      return;
    }

    try {
      const res = await api.authorizeAssessmentRetake(attemptId);
      if (res.success) {
        setSuccessMsg('Retake authorized! The candidate can now start a new attempt.');
        fetchAttempts();
      }
    } catch (err) {
      setError(err.message || 'Failed to authorize retake');
    }
  };

  const handleShortlistCandidate = async (applicationId) => {
    try {
      const res = await api.updateApplicationStatus(applicationId, {
        status: 'Shortlisted',
        note: 'Shortlisted following online assessment review',
      });
      if (res.success) {
        setSuccessMsg('Candidate application status transitioned to Shortlisted.');
        fetchAttempts();
      }
    } catch (err) {
      setError(err.message || 'Failed to update application status');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Online Assessments & Candidate Shortlisting
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
            Assign 15-minute 10-MCQ assessments, monitor live test statuses, and review evaluated results.
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconPlus size={16} />
          <span>Assign Assessment</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* KPI Overview Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '14px', borderLeft: '4px solid #64748b' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>TOTAL ASSIGNED</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{stats.total}</div>
          </div>
          <div className="card" style={{ padding: '14px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>IN PROGRESS</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb', marginTop: '4px' }}>{stats.inProgress}</div>
          </div>
          <div className="card" style={{ padding: '14px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>SUBMITTED</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#7c3aed', marginTop: '4px' }}>{stats.submitted + stats.autoSubmitted}</div>
          </div>
          <div className="card" style={{ padding: '14px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>PASSED</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a', marginTop: '4px' }}>{stats.passed}</div>
          </div>
          <div className="card" style={{ padding: '14px', borderLeft: '4px solid #dc2626' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>FAILED / TERMINATED</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626', marginTop: '4px' }}>{stats.failed + stats.terminated}</div>
          </div>
          <div className="card" style={{ padding: '14px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>AVERAGE SCORE</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#d97706', marginTop: '4px' }}>{stats.avgScore}%</div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search candidate name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-control"
            style={{ paddingLeft: '34px' }}
          />
          <div style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}>
            <IconSearch size={16} />
          </div>
        </div>

        <select
          value={selectedJob}
          onChange={(e) => { setSelectedJob(e.target.value); setPage(1); }}
          className="form-control"
          style={{ width: '200px' }}
        >
          <option value="">All Jobs</option>
          {jobs.map((j) => (
            <option key={j._id} value={j._id}>{j.title}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
          className="form-control"
          style={{ width: '160px' }}
        >
          <option value="">All Statuses</option>
          <option value="Assigned">Assigned (Not Started)</option>
          <option value="In Progress">In Progress</option>
          <option value="Submitted">Submitted</option>
          <option value="Auto Submitted">Auto Submitted (Expired)</option>
          <option value="Terminated">Terminated (Violations)</option>
          <option value="Evaluated">Evaluated</option>
        </select>

        <select
          value={passedFilter}
          onChange={(e) => { setPassedFilter(e.target.value); setPage(1); }}
          className="form-control"
          style={{ width: '140px' }}
        >
          <option value="">All Results</option>
          <option value="true">Passed Only</option>
          <option value="false">Failed Only</option>
        </select>

        {(search || selectedJob || selectedStatus || passedFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedJob('');
              setSelectedStatus('');
              setPassedFilter('');
              setPage(1);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Attempts Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading candidate assessments...
          </div>
        ) : attempts.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <IconClipboardCheck size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', color: '#0f172a', margin: '0 0 6px 0' }}>No candidate assessments found</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Click "Assign Assessment" to initiate a timed technical evaluation for applicants.
            </p>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Candidate</th>
                <th style={{ padding: '12px 16px' }}>Target Job</th>
                <th style={{ padding: '12px 16px' }}>Resume Score</th>
                <th style={{ padding: '12px 16px' }}>Assessment Score</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Violations</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((att) => {
                const isEvaluated = ['Evaluated', 'Submitted', 'Auto Submitted', 'Terminated'].includes(att.status);

                let statusBadgeStyle = { background: '#f1f5f9', color: '#475569' };
                if (att.status === 'In Progress') {
                  statusBadgeStyle = { background: '#e0f2fe', color: '#0369a1' };
                } else if (att.status === 'Terminated') {
                  statusBadgeStyle = { background: '#fee2e2', color: '#b91c1c' };
                } else if (att.passed) {
                  statusBadgeStyle = { background: '#dcfce7', color: '#15803d' };
                } else if (isEvaluated && !att.passed) {
                  statusBadgeStyle = { background: '#fef2f2', color: '#991b1b' };
                }

                return (
                  <tr key={att._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>
                        {att.candidateId?.name || 'Candidate'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {att.candidateId?.email}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: '500', color: '#334155' }}>
                        {att.jobId?.title || 'Job'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {att.applicationId?.screeningScore !== undefined ? (
                        <span style={{ fontWeight: '600', color: '#475569' }}>
                          {att.applicationId.screeningScore}%
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {isEvaluated ? (
                        <div>
                          <span style={{ fontWeight: '700', fontSize: '15px', color: att.passed ? '#15803d' : '#b91c1c' }}>
                            {att.score}/{att.totalMarks}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>
                            ({att.percentage}%)
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>Pending Test</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{ ...statusBadgeStyle, fontWeight: '600' }}>
                        {att.status === 'Evaluated' ? (att.passed ? 'Passed' : 'Failed') : att.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontWeight: '600',
                        color: att.violationCount > 0 ? '#dc2626' : '#64748b',
                        background: att.violationCount > 0 ? '#fee2e2' : '#f8fafc',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}>
                        {att.violationCount}/3 {att.violationCount >= 3 ? '(Terminated)' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => navigate(`/recruiter/assessments/${att._id}`)}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <IconEye size={14} />
                          <span>Review</span>
                        </button>

                        {isEvaluated && att.applicationId?.applicationStatus !== 'Shortlisted' && (
                          <button
                            onClick={() => handleShortlistCandidate(att.applicationId?._id)}
                            className="btn btn-primary"
                            style={{ fontSize: '12px', padding: '6px 10px', background: '#16a34a', borderColor: '#16a34a' }}
                            title="Shortlist for Interview"
                          >
                            Shortlist
                          </button>
                        )}

                        {(att.status === 'Terminated' || (isEvaluated && !att.passed)) && (
                          <button
                            onClick={() => handleAuthorizeRetake(att._id)}
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            title="Authorize Retake"
                          >
                            <IconRotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Showing {attempts.length} of {pagination.total} candidate attempts
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', fontSize: '13px', fontWeight: '600' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Assessment Modal */}
      {showAssignModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card modal-content" style={{ width: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Assign Online Assessment</h2>
              <button onClick={handleCloseAssignModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Select Job *
                </label>
                <select
                  className="form-control"
                  value={assignForm.jobId}
                  onChange={(e) => handleJobSelectForAssign(e.target.value)}
                  required
                >
                  <option value="">-- Choose Job --</option>
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>
                      {j.title} ({j.requiredSkills?.join(', ') || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Select Candidate Application *
                </label>
                <select
                  className="form-control"
                  value={assignForm.applicationId}
                  onChange={(e) => handleApplicationSelectForAssign(e.target.value)}
                  disabled={!assignForm.jobId}
                  required
                >
                  <option value="">-- Choose Candidate Application --</option>
                  {applications.map((app) => (
                    <option key={app._id} value={app._id}>
                      {app.candidateId?.name} ({app.candidateId?.email}) • Screening: {app.screeningScore || 0}% • Status: {app.applicationStatus}
                    </option>
                  ))}
                </select>
                {assignForm.jobId && applications.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>
                    No applications found for this job.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                    Passing Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    className="form-control"
                    value={assignForm.passingPercentage}
                    onChange={(e) => setAssignForm({ ...assignForm, passingPercentage: Number(e.target.value) || 60 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                    Result Visibility Policy
                  </label>
                  <select
                    className="form-control"
                    value={assignForm.resultVisibility}
                    onChange={(e) => setAssignForm({ ...assignForm, resultVisibility: e.target.value })}
                  >
                    <option value="Immediate">Immediate (Shown upon submission)</option>
                    <option value="After Review">After Review (Shown once reviewed)</option>
                    <option value="Hidden">Hidden (Candidate only sees confirmation)</option>
                  </select>
                </div>
              </div>

              {/* Question Distribution Preview */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  ASSESSMENT SPECIFICATIONS:
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  • Total Questions: <strong>10 MCQs</strong> • Duration: <strong>15 Minutes (Strict timer)</strong><br />
                  • Question Distribution: <strong>3 Easy, 5 Medium, 2 Hard</strong><br />
                  • Anti-Cheating: <strong>Fullscreen enforced, max 3 violations</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={handleCloseAssignModal} className="btn btn-secondary" disabled={assignLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignLoading}>
                  {assignLoading ? 'Assigning...' : 'Assign Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AssessmentsManagement;
