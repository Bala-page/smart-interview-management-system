import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Recruiter Pages
import { RecruiterDashboard } from './pages/recruiter/RecruiterDashboard';
import { JobsManagement } from './pages/recruiter/JobsManagement';
import { JobCreateEdit } from './pages/recruiter/JobCreateEdit';
import { ApplicationsManagement } from './pages/recruiter/ApplicationsManagement';
import { ApplicationDetail } from './pages/recruiter/ApplicationDetail';
import { CandidatesManagement } from './pages/recruiter/CandidatesManagement';
import { InterviewsManagement } from './pages/recruiter/InterviewsManagement';
import { FeedbackReview } from './pages/recruiter/FeedbackReview';
import { HiringDecisions } from './pages/recruiter/HiringDecisions';
import { ReportsAnalytics } from './pages/recruiter/ReportsAnalytics';

// Interviewer Pages
import { InterviewerDashboard } from './pages/interviewer/InterviewerDashboard';
import { InterviewerInterviews } from './pages/interviewer/InterviewerInterviews';

// Candidate Pages
import { CandidateDashboard } from './pages/candidate/CandidateDashboard';
import { JobSearch } from './pages/candidate/JobSearch';
import { JobDetail } from './pages/candidate/JobDetail';
import { CandidateProfile } from './pages/candidate/CandidateProfile';
import { CandidateApplications } from './pages/candidate/CandidateApplications';
import { CandidateInterviews } from './pages/candidate/CandidateInterviews';
import { CandidateNotifications } from './pages/candidate/CandidateNotifications';

export const App = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const getHomeRoute = () => {
    if (!isAuthenticated || !user) return '/login';
    if (user.role === 'recruiter') return '/recruiter/dashboard';
    if (user.role === 'interviewer') return '/interviewer/dashboard';
    return '/candidate/dashboard';
  };

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />

      {/* Public / Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Recruiter Protected Routes */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRoles={['recruiter']}>
            <MainLayout title="Talent Management" />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<RecruiterDashboard />} />
        <Route path="jobs" element={<JobsManagement />} />
        <Route path="jobs/create" element={<JobCreateEdit />} />
        <Route path="jobs/edit/:id" element={<JobCreateEdit />} />
        <Route path="applications" element={<ApplicationsManagement />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="candidates" element={<CandidatesManagement />} />
        <Route path="interviews" element={<InterviewsManagement />} />
        <Route path="feedback" element={<FeedbackReview />} />
        <Route path="decisions" element={<HiringDecisions />} />
        <Route path="reports" element={<ReportsAnalytics />} />
      </Route>

      {/* Interviewer Protected Routes */}
      <Route
        path="/interviewer"
        element={
          <ProtectedRoute allowedRoles={['interviewer']}>
            <MainLayout title="Interviewer Portal" />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<InterviewerDashboard />} />
        <Route path="interviews" element={<InterviewerInterviews />} />
      </Route>

      {/* Candidate Protected Routes */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <MainLayout title="Candidate Portal" />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="jobs" element={<JobSearch />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="profile" element={<CandidateProfile />} />
        <Route path="applications" element={<CandidateApplications />} />
        <Route path="interviews" element={<CandidateInterviews />} />
        <Route path="notifications" element={<CandidateNotifications />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
