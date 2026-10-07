import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconCalendar, IconClock, IconMapPin } from '../../components/Icons';

export const CandidateInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getInterviews('limit=50')
      .then((res) => {
        if (res.success) setInterviews(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            My Interview Schedule
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Confirmed interview appointments, evaluator details, and meeting access credentials
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading interview sessions..." />
      ) : interviews.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--slate-400)' }}>
          You have no upcoming or past interview sessions on file. When a recruiter schedules a session, it will appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {interviews.map((item) => (
            <div key={item._id} className="card">
              <div className="card-header">
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                    {item.jobId?.title || 'Position'} — {item.interviewType} Round
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 2 }}>
                    Evaluator: <strong>{item.interviewerId?.name || 'Assigned Interviewer'}</strong>
                  </div>
                </div>

                <Badge status={item.status} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  padding: '14px 18px',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'block' }}>
                    Interview Date
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                    {item.interviewDate}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'block' }}>
                    Time Slot
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--slate-800)' }}>
                    {item.startTime} - {item.endTime}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'block' }}>
                    Format
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>
                    {item.interviewType} Evaluation
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-700)', display: 'block' }}>
                  Location / Video Link:
                </span>
                <a
                  href={item.locationOrMeetingInfo}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'var(--primary)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    marginTop: 4,
                    display: 'inline-block',
                  }}
                >
                  {item.locationOrMeetingInfo}
                </a>
              </div>

              {item.notes && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', display: 'block' }}>
                    Preparation Notes:
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)', marginTop: 2 }}>
                    {item.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
