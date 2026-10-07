import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const FeedbackReview = () => {
  const [interviews, setInterviews] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.getInterviews('status=Completed&limit=50');
        if (res.success) {
          setInterviews(res.data);

          // For each completed interview, fetch submitted feedback
          const feedbackPromises = res.data.map((intv) =>
            api.getFeedbackByInterview(intv._id).catch(() => ({ success: false, data: [] }))
          );
          const feedbackResults = await Promise.all(feedbackPromises);
          const allFeedbackList = feedbackResults.flatMap((r) => r.data || []);
          setFeedbacks(allFeedbackList);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Interviewer Feedback Evaluations
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Structured ratings, qualitative recommendations, and comments submitted by technical evaluators
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading evaluator feedback records..." />
      ) : feedbacks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--slate-400)' }}>
          No interview feedback has been submitted yet. When interviewers complete sessions and submit evaluations, they will appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {feedbacks.map((fb) => (
            <div key={fb._id} className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    {fb.candidateId?.name} — {fb.jobId?.title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 2 }}>
                    Evaluated by <strong>{fb.interviewerId?.name}</strong> • Submitted on {new Date(fb.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Recommendation:</span>
                  <Badge status={fb.recommendation} />
                </div>
              </div>

              {/* Rating metrics row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12,
                  marginBottom: 16,
                  padding: '12px 16px',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color-subtle)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', display: 'block' }}>
                    Technical
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--slate-800)' }}>
                    {fb.technicalRating} / 5
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', display: 'block' }}>
                    Communication
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--slate-800)' }}>
                    {fb.communicationRating} / 5
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', display: 'block' }}>
                    Problem Solving
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--slate-800)' }}>
                    {fb.problemSolvingRating} / 5
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', display: 'block' }}>
                    Role Knowledge
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--slate-800)' }}>
                    {fb.roleKnowledgeRating} / 5
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', display: 'block' }}>
                    Overall Rating
                  </span>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>
                    {fb.overallRating} / 5
                  </strong>
                </div>
              </div>

              {/* Comments */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-700)', display: 'block' }}>
                  Interviewer Qualitative Notes:
                </span>
                <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginTop: 4, lineHeight: 1.6 }}>
                  "{fb.comments}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
