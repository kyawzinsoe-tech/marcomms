/**
 * Role-Based Access Control (RBAC) - Canonical Definitions & Permission Evaluator
 * Supports Creative Hub & Marcomms Webportal Modules
 */

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HEAD_BRAND: 'head_brand',
  BANK_DESIGN: 'bank_design',
  PAY_DESIGN: 'pay_design',
  COMMS_DESIGN: 'comms_design',
  PROCUREMENT_OFFICER: 'procurement_officer',
  ADMIN: 'admin',
  VIEWER: 'viewer'
};

const PERMISSIONS = {
  // Navigation & Analytics
  DASHBOARD_VIEW: 'dashboard:view',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_PRINT: 'reports:print',

  // Subscriptions CRUD (Creative Hub)
  SUBSCRIPTION_CREATE: 'subscription:create',
  SUBSCRIPTION_READ: 'subscription:read',
  SUBSCRIPTION_UPDATE: 'subscription:update',
  SUBSCRIPTION_DELETE: 'subscription:delete',
  SUBSCRIPTION_ARCHIVE: 'subscription:archive',

  // Token Entries CRUD (Creative Hub)
  TOKEN_CREATE: 'token:create',
  TOKEN_READ: 'token:read',
  TOKEN_UPDATE: 'token:update',
  TOKEN_DELETE: 'token:delete',
  TOKEN_ARCHIVE: 'token:archive',

  // Email Reminders (Creative Hub)
  REMINDER_SEND: 'reminder:send',

  // Asset Libraries CRUD (Marcomms Webportal)
  ASSET_READ_BANK: 'asset:read:bank',
  ASSET_READ_PAY: 'asset:read:pay',
  ASSET_READ_COMMS: 'asset:read:comms',
  ASSET_CREATE_BANK: 'asset:create:bank',
  ASSET_CREATE_PAY: 'asset:create:pay',
  ASSET_CREATE_COMMS: 'asset:create:comms',
  ASSET_UPDATE_BANK: 'asset:update:bank',
  ASSET_UPDATE_PAY: 'asset:update:pay',
  ASSET_UPDATE_COMMS: 'asset:update:comms',
  ASSET_DELETE_BANK: 'asset:delete:bank',
  ASSET_DELETE_PAY: 'asset:delete:pay',
  ASSET_DELETE_COMMS: 'asset:delete:comms',

  // Procurement Supplier Directory CRUD (Marcomms Webportal)
  SUPPLIER_READ: 'supplier:read',
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_UPDATE: 'supplier:update',
  SUPPLIER_DELETE: 'supplier:delete',

  // Printing & Production Order Matrix CRUD (Marcomms Webportal)
  PRODUCTION_ORDER_READ: 'production_order:read',
  PRODUCTION_ORDER_CREATE: 'production_order:create',
  PRODUCTION_ORDER_UPDATE: 'production_order:update',
  PRODUCTION_ORDER_DELETE: 'production_order:delete',
  PRODUCTION_ORDER_APPROVE_PROOF: 'production_order:approve_proof',

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
  const lower = String(role).toLowerCase().trim().replace(/[-_ ]+/g, '_');
  if (lower === 'super_admin' || lower === 'superadmin') {
    return ROLES.SUPER_ADMIN;
  }
  if (lower === 'head_brand' || lower === 'head_of_brand' || lower === 'brand_head') {
    return ROLES.HEAD_BRAND;
  }
  if (lower === 'bank_design' || lower === 'bank_designer') {
    return ROLES.BANK_DESIGN;
  }
  if (lower === 'pay_design' || lower === 'kbzpay_design' || lower === 'pay_designer') {
    return ROLES.PAY_DESIGN;
  }
  if (lower === 'comms_design' || lower === 'comms_designer' || lower === 'communications_design') {
    return ROLES.COMMS_DESIGN;
  }
  if (lower === 'procurement_officer' || lower === 'procurement' || lower === 'procurement_admin') {
    return ROLES.PROCUREMENT_OFFICER;
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

  // 1. Super Admin: Full system authority with safety guardrails
  if (role === ROLES.SUPER_ADMIN) {
    if (permission === PERMISSIONS.USER_DELETE_SUPER_ADMIN) {
      if (target && String(target.id || target._id) === String(user.id || user._id)) {
        return false; // Cannot delete self
      }
      if (context.superAdminCount !== undefined && context.superAdminCount <= 1) {
        return false; // Cannot delete last remaining Super Admin
      }
    }
    return true;
  }

  // 2. Admin: Operational manager across Subscriptions, Tokens, Assets, Suppliers, and Production
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

      // Asset Libraries CRUD
      case PERMISSIONS.ASSET_READ_BANK:
      case PERMISSIONS.ASSET_READ_PAY:
      case PERMISSIONS.ASSET_READ_COMMS:
      case PERMISSIONS.ASSET_CREATE_BANK:
      case PERMISSIONS.ASSET_CREATE_PAY:
      case PERMISSIONS.ASSET_CREATE_COMMS:
      case PERMISSIONS.ASSET_UPDATE_BANK:
      case PERMISSIONS.ASSET_UPDATE_PAY:
      case PERMISSIONS.ASSET_UPDATE_COMMS:
      case PERMISSIONS.ASSET_DELETE_BANK:
      case PERMISSIONS.ASSET_DELETE_PAY:
      case PERMISSIONS.ASSET_DELETE_COMMS:

      // Suppliers & Production Orders CRUD
      case PERMISSIONS.SUPPLIER_READ:
      case PERMISSIONS.SUPPLIER_CREATE:
      case PERMISSIONS.SUPPLIER_UPDATE:
      case PERMISSIONS.SUPPLIER_DELETE:
      case PERMISSIONS.PRODUCTION_ORDER_READ:
      case PERMISSIONS.PRODUCTION_ORDER_CREATE:
      case PERMISSIONS.PRODUCTION_ORDER_UPDATE:
      case PERMISSIONS.PRODUCTION_ORDER_DELETE:
      case PERMISSIONS.PRODUCTION_ORDER_APPROVE_PROOF:

      // Data Operations
      case PERMISSIONS.DATA_IMPORT:
      case PERMISSIONS.DATA_RESET:

      // User Management (Viewers/standard users)
      case PERMISSIONS.USER_VIEW:
      case PERMISSIONS.USER_CREATE_VIEWER:
      case PERMISSIONS.USER_UPDATE_VIEWER:
      case PERMISSIONS.USER_DELETE_VIEWER:
        return true;

      // Admin self update
      case PERMISSIONS.USER_UPDATE_ADMIN:
        if (target && String(target.id || target._id) === String(user.id || user._id)) {
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  // 3. Head / Brand: Brand Asset Governance, Proof Approvals, Subscription Read-only
  if (role === ROLES.HEAD_BRAND) {
    switch (permission) {
      case PERMISSIONS.DASHBOARD_VIEW:
      case PERMISSIONS.REPORTS_VIEW:
      case PERMISSIONS.REPORTS_EXPORT:
      case PERMISSIONS.REPORTS_PRINT:
      case PERMISSIONS.SUBSCRIPTION_READ:
      case PERMISSIONS.TOKEN_READ:

      // All Asset Libraries Full CRUD
      case PERMISSIONS.ASSET_READ_BANK:
      case PERMISSIONS.ASSET_READ_PAY:
      case PERMISSIONS.ASSET_READ_COMMS:
      case PERMISSIONS.ASSET_CREATE_BANK:
      case PERMISSIONS.ASSET_CREATE_PAY:
      case PERMISSIONS.ASSET_CREATE_COMMS:
      case PERMISSIONS.ASSET_UPDATE_BANK:
      case PERMISSIONS.ASSET_UPDATE_PAY:
      case PERMISSIONS.ASSET_UPDATE_COMMS:
      case PERMISSIONS.ASSET_DELETE_BANK:
      case PERMISSIONS.ASSET_DELETE_PAY:
      case PERMISSIONS.ASSET_DELETE_COMMS:

      // Procurement & Production
      case PERMISSIONS.SUPPLIER_READ:
      case PERMISSIONS.PRODUCTION_ORDER_READ:
      case PERMISSIONS.PRODUCTION_ORDER_UPDATE:
      case PERMISSIONS.PRODUCTION_ORDER_APPROVE_PROOF:
        return true;

      default:
        return false;
    }
  }

  // 4. Bank Design: KBZ Bank Asset library specialist
  if (role === ROLES.BANK_DESIGN) {
    switch (permission) {
      case PERMISSIONS.DASHBOARD_VIEW:
      case PERMISSIONS.REPORTS_VIEW:
      case PERMISSIONS.SUBSCRIPTION_READ:
      case PERMISSIONS.TOKEN_READ:

      // Full CRUD on Bank Assets
      case PERMISSIONS.ASSET_READ_BANK:
      case PERMISSIONS.ASSET_CREATE_BANK:
      case PERMISSIONS.ASSET_UPDATE_BANK:
      case PERMISSIONS.ASSET_DELETE_BANK:

      // Read on Pay and Comms Assets
      case PERMISSIONS.ASSET_READ_PAY:
      case PERMISSIONS.ASSET_READ_COMMS:

      // Production order reference
      case PERMISSIONS.PRODUCTION_ORDER_READ:
        return true;

      default:
        return false;
    }
  }

  // 5. Pay Design: KBZPay Asset library specialist
  if (role === ROLES.PAY_DESIGN) {
    switch (permission) {
      case PERMISSIONS.DASHBOARD_VIEW:
      case PERMISSIONS.REPORTS_VIEW:
      case PERMISSIONS.SUBSCRIPTION_READ:
      case PERMISSIONS.TOKEN_READ:

      // Full CRUD on Pay Assets
      case PERMISSIONS.ASSET_READ_PAY:
      case PERMISSIONS.ASSET_CREATE_PAY:
      case PERMISSIONS.ASSET_UPDATE_PAY:
      case PERMISSIONS.ASSET_DELETE_PAY:

      // Read on Bank and Comms Assets
      case PERMISSIONS.ASSET_READ_BANK:
      case PERMISSIONS.ASSET_READ_COMMS:

      // Production order reference
      case PERMISSIONS.PRODUCTION_ORDER_READ:
        return true;

      default:
        return false;
    }
  }

  // 6. Comms Design: KBZBank Comms Asset library specialist
  if (role === ROLES.COMMS_DESIGN) {
    switch (permission) {
      case PERMISSIONS.DASHBOARD_VIEW:
      case PERMISSIONS.REPORTS_VIEW:
      case PERMISSIONS.SUBSCRIPTION_READ:
      case PERMISSIONS.TOKEN_READ:

      // Full CRUD on Comms Assets
      case PERMISSIONS.ASSET_READ_COMMS:
      case PERMISSIONS.ASSET_CREATE_COMMS:
      case PERMISSIONS.ASSET_UPDATE_COMMS:
      case PERMISSIONS.ASSET_DELETE_COMMS:

      // Read on Bank and Pay Assets
      case PERMISSIONS.ASSET_READ_BANK:
      case PERMISSIONS.ASSET_READ_PAY:

      // Production order reference
      case PERMISSIONS.PRODUCTION_ORDER_READ:
        return true;

      default:
        return false;
    }
  }

  // 7. Procurement Officer: Supplier Directory & Production Order Management
  if (role === ROLES.PROCUREMENT_OFFICER) {
    switch (permission) {
      case PERMISSIONS.DASHBOARD_VIEW:
      case PERMISSIONS.REPORTS_VIEW:
      case PERMISSIONS.REPORTS_EXPORT:
      case PERMISSIONS.REPORTS_PRINT:
      case PERMISSIONS.SUBSCRIPTION_READ:
      case PERMISSIONS.TOKEN_READ:

      // Read assets for production alignment
      case PERMISSIONS.ASSET_READ_BANK:
      case PERMISSIONS.ASSET_READ_PAY:
      case PERMISSIONS.ASSET_READ_COMMS:

      // Full CRUD on Suppliers & Production Orders
      case PERMISSIONS.SUPPLIER_READ:
      case PERMISSIONS.SUPPLIER_CREATE:
      case PERMISSIONS.SUPPLIER_UPDATE:
      case PERMISSIONS.SUPPLIER_DELETE:
      case PERMISSIONS.PRODUCTION_ORDER_READ:
      case PERMISSIONS.PRODUCTION_ORDER_CREATE:
      case PERMISSIONS.PRODUCTION_ORDER_UPDATE:
      case PERMISSIONS.PRODUCTION_ORDER_DELETE:
        return true;

      default:
        return false;
    }
  }

  // 8. Viewer: Universal read-only access
  if (role === ROLES.VIEWER) {
    switch (permission) {
      case PERMISSIONS.DASHBOARD_VIEW:
      case PERMISSIONS.REPORTS_VIEW:
      case PERMISSIONS.REPORTS_EXPORT:
      case PERMISSIONS.REPORTS_PRINT:
      case PERMISSIONS.SUBSCRIPTION_READ:
      case PERMISSIONS.TOKEN_READ:
      case PERMISSIONS.ASSET_READ_BANK:
      case PERMISSIONS.ASSET_READ_PAY:
      case PERMISSIONS.ASSET_READ_COMMS:
      case PERMISSIONS.SUPPLIER_READ:
      case PERMISSIONS.PRODUCTION_ORDER_READ:
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
