import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Pagination } from '../../components/Pagination';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconSearch, IconMapPin, IconBriefcase, IconCheck } from '../../components/Icons';

export const JobSearch = () => {
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);

  // Apply state
  const [applyingJobId, setApplyingJobId] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 10,
        status: 'Open',
        ...(search && { search }),
        ...(skill && { skill }),
        ...(location && { location }),
      }).toString();

      const [jobsRes, appsRes] = await Promise.all([
        api.getJobs(query),
        api.getApplications('limit=100'),
      ]);

      if (jobsRes.success) {
        setJobs(jobsRes.data);
        setPagination(jobsRes.pagination);
      }

      if (appsRes.success) {
        const ids = new Set(appsRes.data.map((a) => a.jobId?._id || a.jobId));
        setAppliedJobIds(ids);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleQuickApply = async (jobId) => {
    setApplyingJobId(jobId);
    try {
      const res = await api.applyJob({ jobId });
      if (res.success) {
        alert(`Application submitted successfully! Your screening match score: ${res.data.screeningResult?.overallMatchScore || 0}%`);
        setAppliedJobIds((prev) => new Set([...prev, jobId]));
      }
    } catch (err) {
      alert(err.response?.message || err.message || 'Application failed');
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Explore Open Engineering Positions
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Find roles matching your technical skill set with transparent automated screening
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <form onSubmit={handleFilterSubmit} className="toolbar" style={{ margin: 0 }}>
          <div className="filter-group">
            <div style={{ position: 'relative', width: 260 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Title or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <input
              type="text"
              className="form-control"
              style={{ width: 180 }}
              placeholder="Skill (e.g. React)..."
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            />

            <input
              type="text"
              className="form-control"
              style={{ width: 160 }}
              placeholder="Location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <button type="submit" className="btn btn-secondary btn-sm">
              <IconSearch size={14} /> Filter Jobs
            </button>
          </div>
        </form>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <LoadingSpinner text="Searching available requisitions..." />
      ) : jobs.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--slate-400)' }}>
          No open job positions matched your search criteria.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {jobs.map((job) => {
            const isApplied = appliedJobIds.has(job._id);

            return (
              <div key={job._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                      {job.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconMapPin size={14} /> {job.location}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconBriefcase size={14} /> {job.employmentType}
                    </span>
                    <span>•</span>
                    <span>{job.minimumExperience}+ yrs exp</span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.86rem',
                      color: 'var(--slate-600)',
                      lineHeight: 1.5,
                      marginBottom: 14,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {job.description}
                  </p>

                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase' }}>
                      Required Skills:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {(job.requiredSkills || []).map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: '3px 8px',
                            background: 'var(--slate-100)',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            color: 'var(--slate-700)',
                            fontWeight: 500,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-color-subtle)',
                  }}
                >
                  <Link
                    to={`/candidate/jobs/${job._id}`}
                    style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}
                  >
                    View Details
                  </Link>

                  {isApplied ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--success)',
                        padding: '6px 12px',
                        background: 'var(--success-light)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <IconCheck size={14} /> Applied
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={applyingJobId === job._id}
                      onClick={() => handleQuickApply(job._id)}
                    >
                      {applyingJobId === job._id ? 'Submitting...' : 'Apply Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />
    </div>
  );
};
