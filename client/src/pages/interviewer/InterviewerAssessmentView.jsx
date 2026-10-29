import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  IconCheck,
  IconX,
  IconClock,
  IconShield,
  IconAward,
  IconCheckCircle,
  IconXCircle,
} from '../../components/Icons';

export const InterviewerAssessmentView = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttemptDetail();
  }, [attemptId]);

  const fetchAttemptDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getAssessmentResult(attemptId);
      if (res.success && res.data?.attempt) {
        setAttempt(res.data.attempt);
      } else {
        throw new Error(res.message || 'Unable to retrieve assessment');
      }
    } catch (err) {
      setError(err.message || 'Failed to load candidate assessment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading candidate technical assessment record...
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="page-container">
        <div className="alert alert-danger">{error || 'Record unavailable'}</div>
        <button onClick={() => navigate('/interviewer/interviews')} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Back to Interviews
        </button>
      </div>
    );
  }

  const durationMin = Math.floor((attempt.durationSeconds || 0) / 60);
  const durationSec = (attempt.durationSeconds || 0) % 60;

  return (
    <div className="page-container">
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary"
          style={{ fontSize: '13px', padding: '6px 12px' }}
        >
          ← Back to Interview Details
        </button>
      </div>

      {/* Candidate Assessment Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {attempt.candidateId?.name}
              </h1>
              <span className="badge" style={{
                background: attempt.passed ? '#dcfce7' : '#fee2e2',
                color: attempt.passed ? '#15803d' : '#b91c1c',
                fontWeight: '700',
                fontSize: '13px',
              }}>
                {attempt.passed ? 'PASSED TECHNICAL ASSESSMENT' : 'FAILED / BELOW BENCHMARK'}
              </span>
            </div>
            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
              Candidate Email: {attempt.candidateId?.email} • Job: <strong>{attempt.jobId?.title}</strong>
            </div>
          </div>
          <div style={{ fontSize: '12px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', color: '#475569' }}>
            Read-Only Technical Evaluation
          </div>
        </div>

        {/* Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>ASSESSMENT SCORE</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: attempt.passed ? '#16a34a' : '#b91c1c', marginTop: '2px' }}>
              {attempt.score} / {attempt.totalMarks} ({attempt.percentage}%)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>DURATION</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>
              {durationMin}m {durationSec}s / 15m
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>PROCTORING VIOLATIONS</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: attempt.violationCount > 0 ? '#dc2626' : '#16a34a', marginTop: '4px' }}>
              {attempt.violationCount} / 3 strikes
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>RESUME SCREENING</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>
              {attempt.applicationId?.screeningScore || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Skill Performance Breakdown */}
      {attempt.skillWiseResults && attempt.skillWiseResults.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
            Technical Skill Competency Analysis
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {attempt.skillWiseResults.map((sk) => (
              <div key={sk.skill} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{sk.skill}</span>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: sk.percentage >= 60 ? '#16a34a' : '#dc2626' }}>
                    {sk.percentage}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${sk.percentage}%`,
                    height: '100%',
                    background: sk.percentage >= 60 ? '#16a34a' : '#dc2626',
                    borderRadius: '4px',
                  }} />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                  {sk.correctCount} of {sk.totalQuestions} questions correct
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Question Review */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
          Candidate Question Answers Review
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {attempt.questionsReview?.map((q, idx) => (
            <div
              key={q.questionId}
              className="card"
              style={{
                padding: '18px',
                borderLeft: q.isCorrect ? '5px solid #16a34a' : '5px solid #dc2626',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Question {idx + 1}</span>
                  <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '11px', fontWeight: '600' }}>
                    {q.skill}
                  </span>
                  <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: '600' }}>
                    {q.difficulty}
                  </span>
                </div>
                <span style={{ fontWeight: '700', fontSize: '13px', color: q.isCorrect ? '#16a34a' : '#dc2626' }}>
                  {q.isCorrect ? '✓ Correct Answer' : '✗ Incorrect Answer'}
                </span>
              </div>

              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>
                {q.questionText}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {q.options?.map((opt, oIdx) => {
                  const isCandidate = q.candidateAnswer === opt.id;
                  const isCorrect = q.correctAnswer === opt.id;
                  return (
                    <div
                      key={opt.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: isCorrect ? '2px solid #16a34a' : isCandidate ? '2px solid #dc2626' : '1px solid #e2e8f0',
                        background: isCorrect ? '#f0fdf4' : isCandidate ? '#fef2f2' : '#ffffff',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span><strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt.text}</span>
                      {isCandidate && (
                        <span style={{ fontWeight: '700', color: isCorrect ? '#16a34a' : '#dc2626' }}>
                          Candidate Answer {isCorrect ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default InterviewerAssessmentView;
