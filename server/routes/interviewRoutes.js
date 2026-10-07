const express = require('express');
const router = express.Router();
const {
  scheduleInterview,
  getInterviews,
  getInterviewById,
  updateInterview,
  updateInterviewStatus,
  deleteInterview,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.post('/', authorize('recruiter'), scheduleInterview);
router.get('/', getInterviews);
router.get('/:id', getInterviewById);
router.put('/:id', authorize('recruiter'), updateInterview);
router.put('/:id/status', authorize('recruiter', 'interviewer'), updateInterviewStatus);
router.delete('/:id', authorize('recruiter'), deleteInterview);

module.exports = router;
