const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  getInterviewers,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', authorize('recruiter'), getUsers);
router.get('/interviewers', authorize('recruiter'), getInterviewers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);

module.exports = router;
