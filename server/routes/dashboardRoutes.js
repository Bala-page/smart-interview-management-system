const express = require('express');
const router = express.Router();
const {
  getRecruiterDashboard,
  getInterviewerDashboard,
  getCandidateDashboard,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/metrics', authorize('recruiter'), getRecruiterDashboard);
router.get('/recruiter', authorize('recruiter'), getRecruiterDashboard);
router.get('/interviewer', authorize('interviewer'), getInterviewerDashboard);
router.get('/candidate', authorize('candidate'), getCandidateDashboard);

module.exports = router;
