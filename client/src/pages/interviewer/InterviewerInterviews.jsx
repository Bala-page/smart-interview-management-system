import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SubmitFeedbackModal } from './SubmitFeedbackModal';
import { IconFileText, IconCalendar, IconAward } from '../../components/Icons';

export const InterviewerInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFeedbackInterview, setActiveFeedbackInterview] = useState(null);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await api.getInterviews('limit=50');
      if (res.success) {
        setInterviews(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Assigned Interview Sessions
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Review candidate resumes, meeting links, and submit technical evaluations
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner text="Loading assigned interviews..." />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Skills Profile</th>
                  <th>Date & Time Slot</th>
                  <th>Meeting Info</th>
                  <th>Status</th>
                  <th>Feedback Action</th>
                </tr>
              </thead>
              <tbody>
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 36, color: 'var(--slate-400)' }}>
                      No interview assignments found.
                    </td>
                  </tr>
                ) : (
                  interviews.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                          {item.candidateId?.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                          {item.candidateId?.email} • {item.candidateId?.experience || 0} yrs exp
                        </div>
                        {item.candidateId?.resumeFileId && (
                          <a
                            href={api.getResumeUrl(item.candidateId.resumeFileId)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ marginTop: 6, fontSize: '0.72rem', padding: '3px 8px' }}
                          >
                            <IconFileText size={13} /> View Resume PDF
                          </a>
                        )}
                      </td>
                      <td>
                        <strong>{item.jobId?.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                          {item.interviewType} Round
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220 }}>
                          {(item.candidateId?.skills || []).map((s) => (
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
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {item.interviewDate}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                          {item.startTime} - {item.endTime}
                        </div>
                      </td>
                      <td>
                        <a
                          href={item.locationOrMeetingInfo}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--primary)',
                            fontSize: '0.8rem',
                            wordBreak: 'break-all',
                            textDecoration: 'underline',
                          }}
                        >
                          {item.locationOrMeetingInfo}
                        </a>
                      </td>
                      <td>
                        <Badge status={item.status} />
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setActiveFeedbackInterview(item)}
                        >
                          <IconAward size={14} />{' '}
                          {item.status === 'Completed' ? 'Update Feedback' : 'Submit Feedback'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SubmitFeedbackModal
        isOpen={Boolean(activeFeedbackInterview)}
        onClose={() => setActiveFeedbackInterview(null)}
        interview={activeFeedbackInterview}
        onFeedbackSubmitted={fetchInterviews}
      />
    </div>
  );
};
