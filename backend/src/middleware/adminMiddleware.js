const { PERMISSIONS, hasPermission, normalizeRole, ROLES } = require('../config/rbac');

/**
 * Middleware generator for required permissions
 * @param {String} permission - Required permission string from PERMISSIONS
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required. Please provide a valid session token.'
      });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        error: `Access denied. Insufficient permissions for "${permission}".`
      });
    }

    next();
  };
}

/**
 * Legacy helper: require Super Admin or Admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  const role = normalizeRole(req.user.role);
  if (role !== ROLES.SUPER_ADMIN && role !== ROLES.ADMIN) {
    return res.status(403).json({
      error: 'Access denied. Administrator or Super Administrator privileges required.'
    });
  }

  next();
}

/**
 * Legacy helper: require Super Admin strictly
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  const role = normalizeRole(req.user.role);
  if (role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      error: 'Access denied. Super Administrator privileges required.'
    });
  }

  next();
}

module.exports = {
  requirePermission,
  requireAdmin,
  requireSuperAdmin
};
