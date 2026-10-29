import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconShield,
  IconRotateCcw,
  IconAward,
  IconCheckCircle,
  IconXCircle,
} from '../../components/Icons';

export const AssessmentAttemptDetail = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchAttemptDetail();
  }, [attemptId]);

  const fetchAttemptDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getAssessmentResult(attemptId);
      if (res.success) {
        setAttempt(res.data.attempt);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assessment attempt');
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = async () => {
    if (!attempt?.applicationId?._id) return;
    try {
      const res = await api.updateApplicationStatus(attempt.applicationId._id, {
        status: 'Shortlisted',
        note: `Candidate shortlisted after scoring ${attempt.score}/${attempt.totalMarks} (${attempt.percentage}%) on online assessment.`,
      });
      if (res.success) {
        setSuccessMsg('Candidate status updated to Shortlisted!');
        fetchAttemptDetail();
      }
    } catch (err) {
      setError(err.message || 'Failed to shortlist candidate');
    }
  };

  const handleAuthorizeRetake = async () => {
    if (!window.confirm('Reset this candidate attempt and authorize a fresh retake?')) return;
    try {
      const res = await api.authorizeAssessmentRetake(attemptId);
      if (res.success) {
        setSuccessMsg('Retake authorized! Attempt reset for candidate.');
        fetchAttemptDetail();
      }
    } catch (err) {
      setError(err.message || 'Failed to authorize retake');
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading assessment evaluation breakdown...
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="page-container">
        <div className="alert alert-danger">{error || 'Attempt not found'}</div>
        <button onClick={() => navigate('/recruiter/assessments')} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Back to Assessments
        </button>
      </div>
    );
  }

  const isEvaluated = ['Evaluated', 'Submitted', 'Auto Submitted', 'Terminated'].includes(attempt.status);
  const durationMin = Math.floor((attempt.durationSeconds || 0) / 60);
  const durationSec = (attempt.durationSeconds || 0) % 60;

  return (
    <div className="page-container">
      {/* Back button */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/recruiter/assessments')}
          className="btn btn-secondary"
          style={{ fontSize: '13px', padding: '6px 12px' }}
        >
          ← Back to All Assessments
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
      {successMsg && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{successMsg}</div>}

      {/* Candidate Overview Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {attempt.candidateId?.name}
              </h1>
              <span className="badge" style={{
                background: attempt.passed ? '#dcfce7' : attempt.status === 'Terminated' ? '#fee2e2' : '#fef3c7',
                color: attempt.passed ? '#15803d' : attempt.status === 'Terminated' ? '#b91c1c' : '#b45309',
                fontWeight: '700',
                fontSize: '13px',
                padding: '4px 10px',
              }}>
                {attempt.passed ? 'PASSED' : attempt.status === 'Terminated' ? 'TERMINATED' : 'NOT PASSED'}
              </span>
            </div>
            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              {attempt.candidateId?.email} • Job: <strong>{attempt.jobId?.title}</strong>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {attempt.applicationId?.applicationStatus !== 'Shortlisted' && (
              <button onClick={handleShortlist} className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                Shortlist Candidate
              </button>
            )}
            <button onClick={handleAuthorizeRetake} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconRotateCcw size={14} />
              <span>Authorize Retake</span>
            </button>
          </div>
        </div>

        {/* Metric Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>TOTAL SCORE</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: attempt.passed ? '#16a34a' : '#b91c1c', marginTop: '2px' }}>
              {attempt.score} / {attempt.totalMarks}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>PERCENTAGE</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {attempt.percentage}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>DURATION TAKEN</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>
              {durationMin}m {durationSec}s / 15m
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>SUBMISSION REASON</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginTop: '6px' }}>
              {attempt.submissionReason || 'Standard'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>RESUME SCREENING</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#475569', marginTop: '4px' }}>
              {attempt.applicationId?.screeningScore || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Anti-Cheating & Violations Banner */}
      <div className="card" style={{
        padding: '18px 24px',
        marginBottom: '24px',
        borderLeft: attempt.violationCount >= 3 ? '6px solid #dc2626' : attempt.violationCount > 0 ? '6px solid #f59e0b' : '6px solid #16a34a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconShield size={22} style={{ color: attempt.violationCount > 0 ? '#d97706' : '#16a34a' }} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>
                Anti-Cheating Proctoring & Tab Switching Report
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Recorded Violations: <strong>{attempt.violationCount} / 3 strikes</strong>
                {attempt.violationCount >= 3 && ' — Assessment was auto-terminated on strike 3.'}
              </div>
            </div>
          </div>
        </div>

        {/* Violation Log Events */}
        {attempt.violationEvents && attempt.violationEvents.length > 0 && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
              RECORDED VIOLATION TIMELINE:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {attempt.violationEvents.map((evt, idx) => (
                <div key={idx} style={{
                  fontSize: '12px',
                  background: '#fff1f2',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #fecdd3',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span>
                    <strong>Strike #{evt.violationNumber}:</strong> {evt.description || evt.eventType}
                  </span>
                  <span style={{ color: '#881337', fontFamily: 'monospace' }}>
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Skill-Wise Breakdown Cards */}
      {attempt.skillWiseResults && attempt.skillWiseResults.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
            Technical Skill Performance Breakdown
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {attempt.skillWiseResults.map((sk) => (
              <div key={sk.skill} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{sk.skill}</span>
                  <span style={{
                    fontWeight: '700',
                    fontSize: '13px',
                    color: sk.percentage >= 60 ? '#16a34a' : '#dc2626',
                  }}>
                    {sk.percentage}%
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${sk.percentage}%`,
                    height: '100%',
                    background: sk.percentage >= 60 ? '#16a34a' : '#dc2626',
                    borderRadius: '4px',
                  }} />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                  {sk.correctCount} of {sk.totalQuestions} questions answered correctly
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question-By-Question Detailed Review */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
          Question-by-Question Audit & Answers Review (10 Questions)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {attempt.questionsReview?.map((q, idx) => {
            const isAnswered = Boolean(q.candidateAnswer);
            const isCorrect = q.isCorrect;

            return (
              <div
                key={q.questionId}
                className="card"
                style={{
                  padding: '20px',
                  borderLeft: isCorrect ? '5px solid #16a34a' : !isAnswered ? '5px solid #94a3b8' : '5px solid #dc2626',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                      Question {idx + 1}
                    </span>
                    <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '11px', fontWeight: '600' }}>
                      {q.skill}
                    </span>
                    <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: '600' }}>
                      {q.difficulty}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isCorrect ? (
                      <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconCheck size={16} /> Correct (+{q.marks} pt)
                      </span>
                    ) : !isAnswered ? (
                      <span style={{ color: '#64748b', fontWeight: '600', fontSize: '13px' }}>
                        Unanswered (0 pt)
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconX size={16} /> Incorrect (0 pt)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', lineHeight: '1.5' }}>
                  {q.questionText}
                </div>

                {/* Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {q.options?.map((opt, optIdx) => {
                    const isCandidateChoice = q.candidateAnswer === opt.id;
                    const isTheCorrectOption = q.correctAnswer === opt.id;

                    let rowBorder = '1px solid #e2e8f0';
                    let rowBg = '#ffffff';
                    let tag = null;

                    if (isTheCorrectOption && isCandidateChoice) {
                      rowBorder = '2px solid #16a34a';
                      rowBg = '#f0fdf4';
                      tag = <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '12px' }}>✓ Candidate Selected (Correct)</span>;
                    } else if (isCandidateChoice && !isTheCorrectOption) {
                      rowBorder = '2px solid #dc2626';
                      rowBg = '#fef2f2';
                      tag = <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '12px' }}>✗ Candidate Selected (Wrong)</span>;
                    } else if (isTheCorrectOption) {
                      rowBorder = '2px solid #16a34a';
                      rowBg = '#f8fafc';
                      tag = <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '12px' }}>✓ Correct Answer</span>;
                    }

                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: rowBorder,
                          background: rowBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ color: '#1e293b' }}>
                          <strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt.text}
                        </span>
                        {tag}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#475569', borderLeft: '3px solid #cbd5e1' }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default AssessmentAttemptDetail;
