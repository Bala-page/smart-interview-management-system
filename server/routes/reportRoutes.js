const express = require('express');
const router = express.Router();
const {
  getHiringFunnel,
  getSelectionRatio,
  getJobPerformance,
  getInterviewerPerformance,
  getCandidateRanking,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);
router.use(authorize('recruiter'));

router.get('/hiring-funnel', getHiringFunnel);
router.get('/selection-ratio', getSelectionRatio);
router.get('/job-performance', getJobPerformance);
router.get('/interviewer-performance', getInterviewerPerformance);
router.get('/candidate-ranking', getCandidateRanking);

module.exports = router;
