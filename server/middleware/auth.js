const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Support token in query string for direct browser navigation (e.g. streaming resume PDFs in new tabs)
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_local_secret_2026'
      );

      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'The user belonging to this token no longer exists.',
          errors: ['User not found'],
        });
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('[Auth Middleware] Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token. Please log in again.',
        errors: [error.message],
      });
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Access denied. No authentication token provided.',
    errors: ['Authorization header missing or invalid format'],
  });
};

module.exports = { protect };
