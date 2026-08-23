/**
 * Role-Based Access Control (RBAC) - Canonical Definitions & Permission Evaluator
 */

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  VIEWER: 'viewer'
};

const PERMISSIONS = {
  // Navigation & Analytics
  DASHBOARD_VIEW: 'dashboard:view',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_PRINT: 'reports:print',

  // Subscriptions CRUD
  SUBSCRIPTION_CREATE: 'subscription:create',
  SUBSCRIPTION_READ: 'subscription:read',
  SUBSCRIPTION_UPDATE: 'subscription:update',
  SUBSCRIPTION_DELETE: 'subscription:delete',
  SUBSCRIPTION_ARCHIVE: 'subscription:archive',

  // Token Entries CRUD
  TOKEN_CREATE: 'token:create',
  TOKEN_READ: 'token:read',
  TOKEN_UPDATE: 'token:update',
  TOKEN_DELETE: 'token:delete',
  TOKEN_ARCHIVE: 'token:archive',

  // Email Reminders
  REMINDER_SEND: 'reminder:send',

  // User Management
  USER_VIEW: 'user:view',
  USER_CREATE_SUPER_ADMIN: 'user:create:super_admin',
  USER_CREATE_ADMIN: 'user:create:admin',
  USER_CREATE_VIEWER: 'user:create:viewer',
  USER_UPDATE_SUPER_ADMIN: 'user:update:super_admin',
  USER_UPDATE_ADMIN: 'user:update:admin',
  USER_UPDATE_VIEWER: 'user:update:viewer',
  USER_DELETE_SUPER_ADMIN: 'user:delete:super_admin',
  USER_DELETE_ADMIN: 'user:delete:admin',
  USER_DELETE_VIEWER: 'user:delete:viewer',

  // System & Database Operations
  DATA_IMPORT: 'data:import',
  DATA_RESET: 'data:reset'
};

/**
 * Normalizes user role string to canonical format
 */
function normalizeRole(role) {
  if (!role) return ROLES.VIEWER;
  const lower = String(role).toLowerCase().trim();
  if (lower === 'super_admin' || lower === 'superadmin' || lower === 'super-admin' || lower === 'super admin') {
    return ROLES.SUPER_ADMIN;
  }
  if (lower === 'admin' || lower === 'administrator') {
    return ROLES.ADMIN;
  }
  return ROLES.VIEWER;
}

/**
 * Evaluates whether a user has a specific permission
 * @param {Object} user - Requesting user object ({ id, role, ... })
 * @param {String} permission - Required permission from PERMISSIONS
 * @param {Object} [target] - Target entity (e.g. user being updated/deleted)
 * @param {Object} [context] - Additional context (e.g. { superAdminCount })
 * @returns {Boolean}
 */
function hasPermission(user, permission, target = null, context = {}) {
  if (!user) return false;
  const role = normalizeRole(user.role);

  // 1. Super Admin: full system authority
  if (role === ROLES.SUPER_ADMIN) {
    return true;
  }

  // 2. Admin: operational authority + viewer user management
  if (role === ROLES.ADMIN) {
    switch (permission) {
      // Analytics & View
      case PERMISSIONS.DASHBOARD_VIEW:
      case PERMISSIONS.REPORTS_VIEW:
      case PERMISSIONS.REPORTS_EXPORT:
      case PERMISSIONS.REPORTS_PRINT:

      // Subscriptions CRUD
      case PERMISSIONS.SUBSCRIPTION_CREATE:
      case PERMISSIONS.SUBSCRIPTION_READ:
      case PERMISSIONS.SUBSCRIPTION_UPDATE:
      case PERMISSIONS.SUBSCRIPTION_DELETE:
      case PERMISSIONS.SUBSCRIPTION_ARCHIVE:

      // Token Entries CRUD
      case PERMISSIONS.TOKEN_CREATE:
      case PERMISSIONS.TOKEN_READ:
      case PERMISSIONS.TOKEN_UPDATE:
      case PERMISSIONS.TOKEN_DELETE:
      case PERMISSIONS.TOKEN_ARCHIVE:

      // Reminders
      case PERMISSIONS.REMINDER_SEND:

      // Data Operations
      case PERMISSIONS.DATA_IMPORT:
      case PERMISSIONS.DATA_RESET:

      // User Management
      case PERMISSIONS.USER_VIEW:
      case PERMISSIONS.USER_CREATE_VIEWER:
      case PERMISSIONS.USER_UPDATE_VIEWER:
      case PERMISSIONS.USER_DELETE_VIEWER:
        return true;

      // Special check for editing self
      case PERMISSIONS.USER_UPDATE_ADMIN:
        if (target && String(target.id || target._id) === String(user.id || user._id)) {
          return true; // Admin can update their own details (name/password), but role elevation is blocked
        }
        return false;

      default:
        return false;
    }
  }

  // 3. Viewer: read-only access
  if (role === ROLES.VIEWER) {
    switch (permission) {
      case PERMISSIONS.DASHBOARD_VIEW:
      case PERMISSIONS.REPORTS_VIEW:
      case PERMISSIONS.REPORTS_EXPORT:
      case PERMISSIONS.REPORTS_PRINT:
      case PERMISSIONS.SUBSCRIPTION_READ:
      case PERMISSIONS.TOKEN_READ:
        return true;
      default:
        return false;
    }
  }

  return false;
}

module.exports = {
  ROLES,
  PERMISSIONS,
  normalizeRole,
  hasPermission
};
