const express = require('express');
const router = express.Router();
const { uploadResume, getResume } = require('../controllers/resumeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { uploadResume: multerUpload } = require('../middleware/upload');

router.use(protect);

router.post('/upload', authorize('candidate'), multerUpload.single('resume'), uploadResume);
router.get('/:id', getResume);

module.exports = router;
