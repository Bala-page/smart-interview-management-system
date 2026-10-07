import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Pagination } from '../../components/Pagination';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconSearch, IconFileText } from '../../components/Icons';

export const CandidatesManagement = () => {
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        role: 'candidate',
        page,
        limit: 10,
        ...(search && { search }),
      }).toString();

      const res = await api.getUsers(query);
      if (res.success) {
        setCandidates(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates();
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Candidate Talent Directory
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Search registered candidates, inspect verified skill profiles and review resume records
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} className="filter-group" style={{ margin: 0 }}>
          <div style={{ position: 'relative', width: 340 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by candidate name, email, or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            <IconSearch size={14} /> Search Candidates
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner text="Loading candidate profiles..." />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Location</th>
                  <th>Experience</th>
                  <th>Skills Profile</th>
                  <th>Resume PDF</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--slate-400)' }}>
                      No candidates found matching query
                    </td>
                  </tr>
                ) : (
                  candidates.map((cand) => (
                    <tr key={cand._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{cand.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>{cand.email}</div>
                        {cand.phone && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--slate-400)' }}>{cand.phone}</div>
                        )}
                      </td>
                      <td>{cand.location || 'Remote / Unspecified'}</td>
                      <td>
                        <strong>{cand.experience || 0} years</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 280 }}>
                          {(cand.skills || []).map((skill) => (
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
                          {(cand.skills || []).length === 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                              No skills recorded
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {cand.resumeFileId ? (
                          <a
                            href={api.getResumeUrl(cand.resumeFileId)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                          >
                            <IconFileText size={14} /> Resume PDF
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                            No resume attached
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                        {new Date(cand.createdAt).toLocaleDateString()}
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
