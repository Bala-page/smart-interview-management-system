const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  assignAssessment,
  getRecruiterAttempts,
  getMyAssessments,
  startAttempt,
  getAttemptForTaking,
  saveAnswers,
  recordViolation,
  submitAssessment,
  getAttemptResult,
  authorizeRetake,
} = require('../controllers/assessmentController');

router.use(protect);

// Recruiter endpoints
router.post('/assign', authorize('recruiter'), assignAssessment);
router.get('/recruiter/attempts', authorize('recruiter'), getRecruiterAttempts);
router.post('/attempts/:id/authorize-retake', authorize('recruiter'), authorizeRetake);

// Candidate test-taking endpoints
router.get('/candidate/my-assessments', authorize('candidate'), getMyAssessments);
router.post('/attempts/:id/start', authorize('candidate'), startAttempt);
router.get('/attempts/:id/take', authorize('candidate'), getAttemptForTaking);
router.put('/attempts/:id/save-answers', authorize('candidate'), saveAnswers);
router.post('/attempts/:id/record-violation', authorize('candidate'), recordViolation);

// Submission endpoint (candidate submit or recruiter auto/forced submit)
router.post('/attempts/:id/submit', submitAssessment);

// Result endpoint (accessible to candidate, recruiter, interviewer with role-specific views)
router.get('/attempts/:id/result', getAttemptResult);

module.exports = router;
