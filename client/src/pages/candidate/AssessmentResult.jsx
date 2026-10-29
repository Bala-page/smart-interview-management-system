import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  IconCheckCircle,
  IconXCircle,
  IconClock,
  IconAward,
  IconShield,
} from '../../components/Icons';

export const AssessmentResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getAssessmentResult(attemptId);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        throw new Error(res.message || 'Unable to retrieve assessment result');
      }
    } catch (err) {
      setError(err.message || 'Failed to load assessment result');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Retrieving your assessment evaluation...
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="page-container">
        <div className="alert alert-danger">{error || 'Result unavailable'}</div>
        <button onClick={() => navigate('/candidate/assessments')} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Back to Assessments
        </button>
      </div>
    );
  }

  // Handle Hidden or After Review visibility policies
  if (result.visibility === 'Hidden' || result.visibility === 'After Review') {
    return (
      <div className="page-container" style={{ maxWidth: '640px', margin: '40px auto' }}>
        <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <IconCheckCircle size={36} style={{ color: '#2563eb' }} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>
            Assessment Completed & Submitted
          </h1>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
            {result.message}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => navigate('/candidate/applications')} className="btn btn-secondary">
              My Applications
            </button>
            <button onClick={() => navigate('/candidate/assessments')} className="btn btn-primary">
              My Assessments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const durationMin = Math.floor((result.durationSeconds || 0) / 60);
  const durationSec = (result.durationSeconds || 0) % 60;

  return (
    <div className="page-container" style={{ maxWidth: '780px', margin: '20px auto' }}>
      {/* Result Card */}
      <div className="card" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: result.passed ? '#dcfce7' : '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
        }}>
          {result.passed ? (
            <IconCheckCircle size={42} style={{ color: '#16a34a' }} />
          ) : (
            <IconXCircle size={42} style={{ color: '#dc2626' }} />
          )}
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
          {result.passed ? 'Congratulations! You Passed' : 'Assessment Completed'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>
          {result.jobTitle} • Technical Assessment
        </p>

        {/* Score Display */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>YOUR SCORE</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: result.passed ? '#16a34a' : '#b91c1c', marginTop: '4px' }}>
              {result.score} / {result.totalMarks}
            </div>
          </div>
          <div style={{ height: '40px', width: '1px', background: '#cbd5e1' }} />
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>PERCENTAGE</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
              {result.percentage}%
            </div>
          </div>
          <div style={{ height: '40px', width: '1px', background: '#cbd5e1' }} />
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>PASSING BENCHMARK</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#475569', marginTop: '8px' }}>
              {result.passingPercentage || 60}%
            </div>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Completed in <strong>{durationMin}m {durationSec}s</strong> • Violations: <strong>{result.violationCount || 0}/3</strong>
        </div>
      </div>

      {/* Skill-Wise Analysis */}
      {result.skillWiseResults && result.skillWiseResults.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0' }}>
            Skill-Wise Performance Breakdown
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {result.skillWiseResults.map((sk) => (
              <div key={sk.skill}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  <span>{sk.skill} ({sk.correctCount}/{sk.totalQuestions} correct)</span>
                  <span style={{ color: sk.percentage >= 60 ? '#16a34a' : '#dc2626' }}>{sk.percentage}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${sk.percentage}%`,
                    height: '100%',
                    background: sk.percentage >= 60 ? '#16a34a' : '#dc2626',
                    borderRadius: '4px',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps Card */}
      <div className="card" style={{ padding: '20px', background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1e40af', margin: '0 0 6px 0' }}>
          What happens next?
        </h3>
        <p style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5', margin: 0 }}>
          Your assessment results and resume screening score are now under review by the hiring manager. If shortlisted, you will receive an interview scheduling invitation via notifications.
        </p>
      </div>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/candidate/applications')} className="btn btn-secondary" style={{ padding: '10px 20px' }}>
          View My Applications
        </button>
        <button onClick={() => navigate('/candidate/assessments')} className="btn btn-primary" style={{ padding: '10px 24px' }}>
          Return to Assessments
        </button>
      </div>
    </div>
  );
};
export default AssessmentResult;
