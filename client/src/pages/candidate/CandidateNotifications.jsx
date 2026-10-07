import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../../services/api';
import { setNotifications, markRead, markAllRead } from '../../store/notificationSlice';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { IconBell, IconCheck } from '../../components/Icons';

export const CandidateNotifications = () => {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.notifications);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await api.getNotifications('limit=50');
      if (res.success) {
        dispatch(setNotifications(res.data));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      dispatch(markRead(id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      dispatch(markAllRead());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            System Notifications
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Status updates, interview invitations, and application decisions
          </p>
        </div>

        {notifications.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
            Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--slate-400)' }}>
          No notifications yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className="card"
              style={{
                marginBottom: 0,
                backgroundColor: !notif.isRead ? 'var(--primary-light)' : '#fff',
                borderColor: !notif.isRead ? 'var(--primary-border)' : 'var(--border-color)',
                cursor: 'pointer',
              }}
              onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                      {notif.title}
                    </h4>
                    {!notif.isRead && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          backgroundColor: 'var(--primary)',
                          color: '#fff',
                          borderRadius: 4,
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--slate-700)', marginTop: 4 }}>
                    {notif.message}
                  </p>
                </div>

                <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                  {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
