const express = require('express');
const router = express.Router();
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
} = require('../controllers/jobController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Optional auth middleware for getJobs so candidates only see Open jobs
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};

router.get('/', optionalAuth, getJobs);
router.get('/:id', optionalAuth, getJobById);

// Protected Recruiter Routes
router.post('/', protect, authorize('recruiter'), createJob);
router.put('/:id', protect, authorize('recruiter'), updateJob);
router.put('/:id/status', protect, authorize('recruiter'), updateJobStatus);
router.delete('/:id', protect, authorize('recruiter'), deleteJob);

module.exports = router;
