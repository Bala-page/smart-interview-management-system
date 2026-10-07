const express = require('express');
const router = express.Router();
const {
  apply,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.post('/', authorize('candidate'), apply);
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.put('/:id/status', authorize('recruiter'), updateApplicationStatus);

module.exports = router;
