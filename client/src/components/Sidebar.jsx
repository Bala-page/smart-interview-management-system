import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  IconDashboard,
  IconBriefcase,
  IconUsers,
  IconCalendar,
  IconClipboardCheck,
  IconChart,
  IconAward,
  IconUser,
  IconBell,
  IconSearch,
} from './Icons';

export const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'candidate';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <IconBriefcase size={22} />
        </div>
        <div>
          <div className="sidebar-brand-title">SIMS Enterprise</div>
          <div className="sidebar-brand-sub">Smart Interview System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Recruiter Navigation */}
        {role === 'recruiter' && (
          <>
            <NavLink
              to="/recruiter/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/recruiter/jobs"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconBriefcase size={18} />
              <span>Jobs Management</span>
            </NavLink>
            <NavLink
              to="/recruiter/applications"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconClipboardCheck size={18} />
              <span>Applications & Screening</span>
            </NavLink>
            <NavLink
              to="/recruiter/candidates"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconUsers size={18} />
              <span>Candidate Directory</span>
            </NavLink>
            <NavLink
              to="/recruiter/interviews"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconCalendar size={18} />
              <span>Interview Schedule</span>
            </NavLink>
            <NavLink
              to="/recruiter/feedback"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconAward size={18} />
              <span>Feedback Review</span>
            </NavLink>
            <NavLink
              to="/recruiter/decisions"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconClipboardCheck size={18} />
              <span>Hiring Decisions</span>
            </NavLink>
            <NavLink
              to="/recruiter/reports"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconChart size={18} />
              <span>Reports & Analytics</span>
            </NavLink>
          </>
        )}

        {/* Interviewer Navigation */}
        {role === 'interviewer' && (
          <>
            <NavLink
              to="/interviewer/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/interviewer/interviews"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconCalendar size={18} />
              <span>Assigned Interviews</span>
            </NavLink>
          </>
        )}

        {/* Candidate Navigation */}
        {role === 'candidate' && (
          <>
            <NavLink
              to="/candidate/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/candidate/jobs"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconSearch size={18} />
              <span>Browse Open Jobs</span>
            </NavLink>
            <NavLink
              to="/candidate/applications"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconClipboardCheck size={18} />
              <span>My Applications</span>
            </NavLink>
            <NavLink
              to="/candidate/interviews"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconCalendar size={18} />
              <span>My Interviews</span>
            </NavLink>
            <NavLink
              to="/candidate/profile"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconUser size={18} />
              <span>Profile & Resume</span>
            </NavLink>
            <NavLink
              to="/candidate/notifications"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <IconBell size={18} />
              <span>Notifications</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.name || 'User'}</span>
          <span className="sidebar-user-role">{role}</span>
        </div>
      </div>
    </aside>
  );
};
