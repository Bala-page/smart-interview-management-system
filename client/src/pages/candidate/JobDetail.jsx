import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconMapPin, IconBriefcase, IconCheck } from '../../components/Icons';

export const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [isApplied, setIsApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobRes, appsRes] = await Promise.all([
          api.getJobById(id),
          api.getApplications(`jobId=${id}`),
        ]);

        if (jobRes.success) setJob(jobRes.data);
        if (appsRes.success && appsRes.data.length > 0) {
          setIsApplied(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await api.applyJob({ jobId: id });
      if (res.success) {
        setIsApplied(true);
        alert(`Application submitted successfully! Your automated screening match score: ${res.data.screeningResult?.overallMatchScore || 0}%`);
        navigate('/candidate/applications');
      }
    } catch (err) {
      alert(err.response?.message || err.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading position overview..." />;
  if (!job) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <h3>Job Position Not Found</h3>
        <Link to="/candidate/jobs" className="btn btn-secondary" style={{ marginTop: 12 }}>
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {job.title}
          </h2>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: 4 }}>
            <span>{job.location}</span>
            <span>•</span>
            <span>{job.employmentType}</span>
            <span>•</span>
            <span>{job.minimumExperience}+ years experience</span>
          </div>
        </div>

        <Link to="/candidate/jobs" className="btn btn-outline btn-sm">
          ← Back to Search
        </Link>
      </div>

      <div className="card">
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: 8 }}>
            Required Skills Profile
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(job.requiredSkills || []).map((skill) => (
              <span
                key={skill}
                style={{
                  padding: '4px 10px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid var(--primary-border)',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: 8 }}>
            Role Description & Scope
          </h3>
          <div
            style={{
              fontSize: '0.92rem',
              color: 'var(--slate-700)',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
            }}
          >
            {job.description}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 20,
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
            Published on: {new Date(job.publishedAt || job.createdAt).toLocaleDateString()}
          </div>

          {isApplied ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: 'var(--success-light)',
                color: 'var(--success-hover)',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
              }}
            >
              <IconCheck size={16} /> Application Already Submitted
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
              {applying ? 'Submitting Application...' : 'Apply for this Role'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
