import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to user's authorized home dashboard
    if (user.role === 'recruiter') return <Navigate to="/recruiter/dashboard" replace />;
    if (user.role === 'interviewer') return <Navigate to="/interviewer/dashboard" replace />;
    return <Navigate to="/candidate/dashboard" replace />;
  }

  return children;
};
