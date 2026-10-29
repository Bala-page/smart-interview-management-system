const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  getQuestions,
  getQuestionStats,
  getQuestionById,
  createQuestion,
  updateQuestion,
  toggleQuestionStatus,
  importQuestions,
} = require('../controllers/questionBankController');

// All question bank routes are restricted to recruiters
router.use(protect);
router.use(authorize('recruiter'));

router.get('/', getQuestions);
router.get('/stats', getQuestionStats);
router.post('/import', importQuestions);
router.get('/:id', getQuestionById);
router.post('/', createQuestion);
router.put('/:id', updateQuestion);
router.put('/:id/status', toggleQuestionStatus);

module.exports = router;
