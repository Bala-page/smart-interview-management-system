/**
 * Role-Based Access Control (RBAC) middleware.
 * Restricts access to users having specified roles.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
        errors: ['User context missing'],
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource. Required role(s): [${roles.join(', ')}].`,
        errors: ['Insufficient role privileges'],
      });
    }

    next();
  };
};

module.exports = { authorize };
