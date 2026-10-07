import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconPlus, IconCalendar, IconClock, IconMapPin } from '../../components/Icons';

export const InterviewsManagement = () => {
  const [searchParams] = useSearchParams();
  const [interviews, setInterviews] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    applicationId: searchParams.get('appId') || '',
    candidateId: searchParams.get('candidateId') || '',
    jobId: searchParams.get('jobId') || '',
    interviewerId: '',
    interviewDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    interviewType: 'Technical',
    locationOrMeetingInfo: 'https://meet.local/sims-interview-room',
    notes: '',
  });

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
      }).toString();

      const res = await api.getInterviews(query);
      if (res.success) {
        setInterviews(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load interviewers and eligible applications for dropdowns
    api.getInterviewers().then((res) => {
      if (res.success) setInterviewers(res.data);
    });
    api.getApplications('limit=50').then((res) => {
      if (res.success) setApplications(res.data);
    });

    if (searchParams.get('appId')) {
      setIsModalOpen(true);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [page, statusFilter]);

  const handleApplicationSelect = (appId) => {
    const selectedApp = applications.find((a) => a._id === appId);
    if (selectedApp) {
      setFormData((prev) => ({
        ...prev,
        applicationId: appId,
        candidateId: selectedApp.candidateId?._id || selectedApp.candidateId,
        jobId: selectedApp.jobId?._id || selectedApp.jobId,
      }));
    } else {
      setFormData((prev) => ({ ...prev, applicationId: appId }));
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSubmitting(true);

    try {
      await api.scheduleInterview(formData);
      setIsModalOpen(false);
      fetchInterviews();
    } catch (err) {
      setModalError(err.response?.message || err.message || 'Scheduling conflict or validation error');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.updateInterviewStatus(id, newStatus);
      fetchInterviews();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Interview Scheduling & Assignment
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Schedule interview sessions with conflict detection and interviewer assignment
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <IconPlus size={16} /> Schedule New Interview
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div className="filter-group">
          <select
            className="form-control"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Rescheduled">Rescheduled</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Interviews Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <LoadingSpinner text="Loading interview schedules..." />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Assigned Interviewer</th>
                  <th>Date & Time Slot</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--slate-400)' }}>
                      No interviews found
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
                          {item.candidateId?.email}
                        </div>
                      </td>
                      <td>{item.jobId?.title || 'Job'}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.interviewerId?.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--slate-400)' }}>
                          {item.interviewerId?.email}
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
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate-700)' }}>
                          {item.interviewType}
                        </span>
                      </td>
                      <td>
                        <Badge status={item.status} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {item.status === 'Scheduled' && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleStatusUpdate(item._id, 'Completed')}
                                title="Mark as Completed"
                              >
                                Complete
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleStatusUpdate(item._id, 'Cancelled')}
                                title="Cancel Interview"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {item.status === 'Completed' && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                              ✓ Completed
                            </span>
                          )}
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

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Interview Session"
        maxWidth={620}
      >
        {modalError && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--danger-border)',
              fontSize: '0.85rem',
              marginBottom: 16,
            }}
          >
            {modalError}
          </div>
        )}

        <form onSubmit={handleScheduleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Application & Candidate *</label>
            <select
              required
              className="form-control"
              value={formData.applicationId}
              onChange={(e) => handleApplicationSelect(e.target.value)}
            >
              <option value="">-- Choose Candidate Application --</option>
              {applications.map((app) => (
                <option key={app._id} value={app._id}>
                  {app.candidateId?.name} — {app.jobId?.title} ({app.applicationStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assign Interviewer *</label>
            <select
              required
              className="form-control"
              value={formData.interviewerId}
              onChange={(e) => setFormData({ ...formData, interviewerId: e.target.value })}
            >
              <option value="">-- Choose Assigned Interviewer --</option>
              {interviewers.map((intv) => (
                <option key={intv._id} value={intv._id}>
                  {intv.name} ({intv.availability} • {intv.upcomingCount} upcoming)
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.74rem', color: 'var(--slate-400)', marginTop: 4, display: 'block' }}>
              System validates conflicting time slots automatically before booking.
            </span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Interview Date *</label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.interviewDate}
                onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Interview Type *</label>
              <select
                className="form-control"
                value={formData.interviewType}
                onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })}
              >
                <option value="Technical">Technical</option>
                <option value="HR">HR</option>
                <option value="Managerial">Managerial</option>
                <option value="Behavioral">Behavioral</option>
                <option value="System Design">System Design</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Start Time (HH:mm) *</label>
              <input
                type="time"
                required
                className="form-control"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Time (HH:mm) *</label>
              <input
                type="time"
                required
                className="form-control"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location / Meeting URL *</label>
            <input
              type="text"
              required
              className="form-control"
              value={formData.locationOrMeetingInfo}
              onChange={(e) => setFormData({ ...formData, locationOrMeetingInfo: e.target.value })}
              placeholder="e.g. https://meet.local/room-101 or Office Room 3B"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes for Interviewer & Candidate</label>
            <textarea
              rows="2"
              className="form-control"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Focus on React component architecture, live coding, and problem solving..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={modalSubmitting}>
              {modalSubmitting ? 'Checking Conflicts...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
