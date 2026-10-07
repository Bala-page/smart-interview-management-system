const express = require('express');
const router = express.Router();
const { runScreening, getScreeningResult } = require('../controllers/screeningController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.post('/:applicationId', authorize('recruiter'), runScreening);
router.get('/:applicationId', getScreeningResult);

module.exports = router;
