import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../services/api';
import {
  setNotifications,
  setUnreadCount,
  markRead,
  markAllRead,
} from '../store/notificationSlice';
import { IconBell, IconCheck } from './Icons';

export const NotificationDropdown = () => {
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector((state) => state.notifications);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifs = async () => {
    try {
      const res = await api.getNotifications('limit=10');
      if (res.success) {
        dispatch(setNotifications(res.data));
        dispatch(setUnreadCount(res.unreadCount));
      }
    } catch (err) {
      // Ignore network aborts
    }
  };

  useEffect(() => {
    fetchNotifs();
    // Poll every 12 seconds for local updates
    const interval = setInterval(fetchNotifs, 12000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      dispatch(markRead(id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      dispatch(markAllRead());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        className="btn btn-outline btn-sm"
        style={{ position: 'relative', padding: '8px 10px', borderRadius: '50%' }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <IconBell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: 'var(--danger)',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 800,
              width: 18,
              height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #fff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span className="notif-title">Notifications</span>
            {unreadCount > 0 && (
              <button
                className="btn btn-sm"
                style={{ fontSize: '0.75rem', padding: '2px 8px', color: 'var(--primary)' }}
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--slate-400)', fontSize: '0.85rem' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={(e) => !notif.isRead && handleMarkAsRead(notif._id, e)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="notif-item-title">{notif.title}</div>
                    {!notif.isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary)',
                          marginTop: 4,
                        }}
                      />
                    )}
                  </div>
                  <div className="notif-item-msg">{notif.message}</div>
                  <div className="notif-item-time">
                    {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
