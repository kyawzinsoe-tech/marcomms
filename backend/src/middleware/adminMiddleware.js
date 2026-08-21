// Middleware: Require Super Admin or Admin role
function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'super_admin' && req.user.role !== 'admin')) {
    return res.status(403).json({
      error: 'Access denied. Administrator or Super Administrator privileges required.'
    });
  }
  next();
}

// Middleware: Require Super Admin role strictly
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Access denied. This action requires Super Administrator privileges.'
    });
  }
  next();
}

module.exports = { requireAdmin, requireSuperAdmin };
