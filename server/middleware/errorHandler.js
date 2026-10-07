/**
 * Centralized Error Handling Middleware
 * Consistent response structure across all routes.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = [];

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = `Resource not found with invalid identifier format: ${err.value}`;
    errors.push(`Invalid ID: ${err.value}`);
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    message = `Duplicate value entered for ${field}: '${val}'. It must be unique.`;
    errors.push(`${field} already exists with value '${val}'`);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map(val => val.message);
  }

  // Multer Error (e.g. file size exceeded)
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      const limitMb = process.env.UPLOAD_LIMIT_MB || 10;
      message = `Uploaded file exceeds maximum limit of ${limitMb}MB.`;
      errors.push(`File too large. Maximum size is ${limitMb}MB.`);
    } else {
      message = `File upload error: ${err.message}`;
      errors.push(err.message);
    }
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
    errors.push('Signature verification failed');
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please login again.';
    errors.push('Token expired');
  }

  if (errors.length === 0) {
    errors.push(message);
  }

  // Log server errors for internal debugging
  if (statusCode >= 500) {
    console.error('[Unhandled Server Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500
      ? { stack: err.stack }
      : {}),
  });
};

module.exports = errorHandler;
