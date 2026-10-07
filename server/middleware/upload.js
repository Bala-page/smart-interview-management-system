const multer = require('multer');
const path = require('path');

const uploadLimitMb = parseInt(process.env.UPLOAD_LIMIT_MB, 10) || 10;
const maxFileSizeBytes = uploadLimitMb * 1024 * 1024;

// Memory storage allows direct streaming to MongoDB GridFS and in-memory parsing with pdf-parse
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (ext !== '.pdf' || (mimeType !== 'application/pdf' && mimeType !== 'application/x-pdf')) {
    const error = new Error('Invalid file format. Only PDF files (.pdf) are allowed.');
    error.status = 400;
    return cb(error, false);
  }

  cb(null, true);
};

const uploadResume = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1,
  },
  fileFilter,
});

module.exports = {
  uploadResume,
};
