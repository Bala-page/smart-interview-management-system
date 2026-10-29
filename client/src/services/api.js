const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Universal fetch wrapper with JSON serialization, JWT auth headers, and standard error handling
 */
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('sims_token');

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData, do not set Content-Type header (browser sets boundary automatically)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Check for 401 unauthenticated
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('sims_token');
      localStorage.removeItem('sims_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.response = data;
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error.message);
    throw error;
  }
};

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),
  updateProfile: (profileData) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) }),

  // Users
  getUsers: (params = '') => request(`/users?${params}`),
  getUserById: (id) => request(`/users/${id}`),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getInterviewers: () => request('/users/interviewers'),

  // Jobs
  getJobs: (params = '') => request(`/jobs?${params}`),
  getJobById: (id) => request(`/jobs/${id}`),
  createJob: (jobData) => request('/jobs', { method: 'POST', body: JSON.stringify(jobData) }),
  updateJob: (id, jobData) => request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(jobData) }),
  updateJobStatus: (id, status) => request(`/jobs/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: 'DELETE' }),

  // Applications
  applyJob: (data) => request('/applications', { method: 'POST', body: JSON.stringify(data) }),
  getApplications: (params = '') => request(`/applications?${params}`),
  getApplicationById: (id) => request(`/applications/${id}`),
  updateApplicationStatus: (id, statusData) =>
    request(`/applications/${id}/status`, { method: 'PUT', body: JSON.stringify(statusData) }),

  // Resume
  uploadResume: (formData) => request('/resume/upload', { method: 'POST', body: formData }),
  getResumeUrl: (fileId) => {
    if (!fileId) return '#';
    const token = localStorage.getItem('sims_token');
    return `${API_BASE}/resume/${fileId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // Screening
  runScreening: (applicationId) => request(`/screening/${applicationId}`, { method: 'POST' }),
  getScreeningResult: (applicationId) => request(`/screening/${applicationId}`),

  // Interviews
  scheduleInterview: (interviewData) =>
    request('/interviews', { method: 'POST', body: JSON.stringify(interviewData) }),
  getInterviews: (params = '') => request(`/interviews?${params}`),
  getInterviewById: (id) => request(`/interviews/${id}`),
  updateInterview: (id, data) => request(`/interviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateInterviewStatus: (id, status) =>
    request(`/interviews/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteInterview: (id) => request(`/interviews/${id}`, { method: 'DELETE' }),

  // Feedback
  submitFeedback: (feedbackData) =>
    request('/feedback', { method: 'POST', body: JSON.stringify(feedbackData) }),
  getFeedbackByInterview: (interviewId) => request(`/feedback/${interviewId}`),
  updateFeedback: (id, data) => request(`/feedback/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: (params = '') => request(`/notifications?${params}`),
  getUnreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // Dashboard
  getRecruiterDashboard: () => request('/dashboard/recruiter'),
  getInterviewerDashboard: () => request('/dashboard/interviewer'),
  getCandidateDashboard: () => request('/dashboard/candidate'),

  // Reports
  getHiringFunnel: () => request('/reports/hiring-funnel'),
  getSelectionRatio: () => request('/reports/selection-ratio'),
  getJobPerformance: () => request('/reports/job-performance'),
  getInterviewerPerformance: () => request('/reports/interviewer-performance'),
  getCandidateRanking: (params = '') => request(`/reports/candidate-ranking?${params}`),

  // Online Assessment & Question Bank
  getQuestions: (params = '') => request(`/question-bank?${params}`),
  getQuestionStats: () => request('/question-bank/stats'),
  getQuestionById: (id) => request(`/question-bank/${id}`),
  createQuestion: (data) => request('/question-bank', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id, data) => request(`/question-bank/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleQuestionStatus: (id) => request(`/question-bank/${id}/status`, { method: 'PUT' }),
  importQuestions: (questions) => request('/question-bank/import', { method: 'POST', body: JSON.stringify({ questions }) }),

  assignAssessment: (data) => request('/assessments/assign', { method: 'POST', body: JSON.stringify(data) }),
  getRecruiterAttempts: (params = '') => request(`/assessments/recruiter/attempts?${params}`),
  getMyAssessments: () => request('/assessments/candidate/my-assessments'),
  startAssessment: (attemptId) => request(`/assessments/attempts/${attemptId}/start`, { method: 'POST' }),
  getAttemptForTaking: (attemptId) => request(`/assessments/attempts/${attemptId}/take`),
  saveAssessmentAnswers: (attemptId, answers) =>
    request(`/assessments/attempts/${attemptId}/save-answers`, { method: 'PUT', body: JSON.stringify({ answers }) }),
  recordAssessmentViolation: (attemptId, eventData) =>
    request(`/assessments/attempts/${attemptId}/record-violation`, { method: 'POST', body: JSON.stringify(eventData) }),
  submitAssessment: (attemptId, submissionData = {}) =>
    request(`/assessments/attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify(submissionData) }),
  getAssessmentResult: (attemptId) => request(`/assessments/attempts/${attemptId}/result`),
  authorizeAssessmentRetake: (attemptId) =>
    request(`/assessments/attempts/${attemptId}/authorize-retake`, { method: 'POST' }),
};
