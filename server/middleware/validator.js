/**
 * Lightweight request validation middleware utilities
 */
const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push('Name is required');
  if (!email || !email.trim()) errors.push('Email is required');
  else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email)) {
    errors.push('A valid email address is required');
  }
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters long');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed on registration form',
      errors,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !email.trim()) errors.push('Email is required');
  if (!password) errors.push('Password is required');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed on login form',
      errors,
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
};
