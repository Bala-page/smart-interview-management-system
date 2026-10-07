import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { Pagination } from '../../components/Pagination';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconPlus, IconSearch, IconTrash, IconEdit } from '../../components/Icons';

export const JobsManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      }).toString();

      const res = await api.getJobs(query);
      if (res.success) {
        setJobs(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await api.updateJobStatus(jobId, newStatus);
      fetchJobs();
    } catch (err) {
      alert(err.message || 'Failed to update job status');
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteJob(jobId);
      fetchJobs();
    } catch (err) {
      alert(err.message || 'Failed to delete job');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Job Postings Management
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Create, publish, edit, and monitor open requisition positions
          </p>
        </div>
        <Link to="/recruiter/jobs/create" className="btn btn-primary">
          <IconPlus size={16} /> Post New Job
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} className="toolbar" style={{ margin: 0 }}>
          <div className="filter-group">
            <div style={{ position: 'relative', width: 280 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search job title or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="form-control"
              style={{ width: 160 }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>
            <button type="submit" className="btn btn-secondary btn-sm">
              <IconSearch size={14} /> Filter
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner text="Loading jobs..." />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Required Skills</th>
                  <th>Experience</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--slate-400)' }}>
                      No jobs found matching criteria
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                          {job.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>
                          Type: {job.employmentType}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 260 }}>
                          {(job.requiredSkills || []).map((skill) => (
                            <span
                              key={skill}
                              style={{
                                padding: '2px 6px',
                                background: 'var(--slate-100)',
                                borderRadius: 4,
                                fontSize: '0.74rem',
                                color: 'var(--slate-700)',
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {job.minimumExperience} - {job.maximumExperience ? `${job.maximumExperience} yrs` : 'Any yrs'}
                      </td>
                      <td>{job.location}</td>
                      <td>
                        <Badge status={job.status} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {job.status === 'Draft' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleStatusChange(job._id, 'Open')}
                            >
                              Publish
                            </button>
                          )}
                          {job.status === 'Open' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStatusChange(job._id, 'Closed')}
                            >
                              Close
                            </button>
                          )}
                          {job.status === 'Closed' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleStatusChange(job._id, 'Open')}
                            >
                              Reopen
                            </button>
                          )}
                          <Link
                            to={`/recruiter/jobs/edit/${job._id}`}
                            className="btn btn-outline btn-sm"
                            title="Edit Job"
                          >
                            <IconEdit size={14} />
                          </Link>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDelete(job._id)}
                            title="Delete Job"
                          >
                            <IconTrash size={14} />
                          </button>
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
