import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { NotificationDropdown } from './NotificationDropdown';
import { Badge } from './Badge';
import { IconLogOut } from './Icons';

export const Navbar = ({ title = 'Dashboard' }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = '/login';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <NotificationDropdown />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
          <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--slate-900)' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
              {user?.email}
            </div>
          </div>

          {user?.role && <Badge status={user.role} />}

          <button
            className="btn btn-outline btn-sm"
            style={{ padding: '6px 10px', marginLeft: 6 }}
            onClick={handleLogout}
            title="Log Out"
          >
            <IconLogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
