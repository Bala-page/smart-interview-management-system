const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  getFeedbackByInterview,
  updateFeedback,
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.post('/', authorize('interviewer'), submitFeedback);
router.get('/:interviewId', authorize('recruiter', 'interviewer'), getFeedbackByInterview);
router.put('/:id', authorize('interviewer', 'recruiter'), updateFeedback);

module.exports = router;
