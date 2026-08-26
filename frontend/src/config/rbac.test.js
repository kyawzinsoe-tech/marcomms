import { describe, it, expect } from 'vitest';
import { ROLES, PERMISSIONS, normalizeRole, hasPermission } from './rbac';

describe('RBAC Role and Permission Evaluator', () => {
  it('normalizes role variations into canonical enum values', () => {
    expect(normalizeRole('superadmin')).toBe(ROLES.SUPER_ADMIN);
    expect(normalizeRole('Super Admin')).toBe(ROLES.SUPER_ADMIN);
    expect(normalizeRole('head_of_brand')).toBe(ROLES.HEAD_BRAND);
    expect(normalizeRole('bank_designer')).toBe(ROLES.BANK_DESIGN);
    expect(normalizeRole('kbzpay_design')).toBe(ROLES.PAY_DESIGN);
    expect(normalizeRole('comms_designer')).toBe(ROLES.COMMS_DESIGN);
    expect(normalizeRole('procurement')).toBe(ROLES.PROCUREMENT_OFFICER);
    expect(normalizeRole('administrator')).toBe(ROLES.ADMIN);
    expect(normalizeRole('random_role')).toBe(ROLES.VIEWER);
    expect(normalizeRole(null)).toBe(ROLES.VIEWER);
  });

  it('evaluates Super Admin permissions correctly with self-delete guardrails', () => {
    const superAdmin = { id: 'sa_1', role: 'super_admin' };
    const otherSa = { id: 'sa_2', role: 'super_admin' };

    expect(hasPermission(superAdmin, PERMISSIONS.SUBSCRIPTION_CREATE)).toBe(true);
    expect(hasPermission(superAdmin, PERMISSIONS.USER_VIEW)).toBe(true);
    expect(hasPermission(superAdmin, PERMISSIONS.DATA_RESET)).toBe(true);

    // Cannot delete self
    expect(hasPermission(superAdmin, PERMISSIONS.USER_DELETE_SUPER_ADMIN, superAdmin)).toBe(false);
    // Can delete other SA if superAdminCount > 1
    expect(hasPermission(superAdmin, PERMISSIONS.USER_DELETE_SUPER_ADMIN, otherSa, { superAdminCount: 2 })).toBe(true);
    // Cannot delete last remaining SA
    expect(hasPermission(superAdmin, PERMISSIONS.USER_DELETE_SUPER_ADMIN, otherSa, { superAdminCount: 1 })).toBe(false);
  });

  it('evaluates Admin permissions correctly', () => {
    const admin = { id: 'adm_1', role: 'admin' };

    expect(hasPermission(admin, PERMISSIONS.SUBSCRIPTION_CREATE)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.TOKEN_CREATE)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.USER_CREATE_VIEWER)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.USER_CREATE_SUPER_ADMIN)).toBe(false);
    expect(hasPermission(admin, PERMISSIONS.USER_CREATE_ADMIN)).toBe(false);
  });

  it('evaluates Head of Brand permissions correctly (sample proof approvals)', () => {
    const headBrand = { id: 'hb_1', role: 'head_brand' };

    expect(hasPermission(headBrand, PERMISSIONS.PRODUCTION_ORDER_APPROVE_PROOF)).toBe(true);
    expect(hasPermission(headBrand, PERMISSIONS.ASSET_CREATE_BANK)).toBe(true);
    expect(hasPermission(headBrand, PERMISSIONS.ASSET_CREATE_PAY)).toBe(true);
    expect(hasPermission(headBrand, PERMISSIONS.ASSET_CREATE_COMMS)).toBe(true);
    expect(hasPermission(headBrand, PERMISSIONS.USER_CREATE_ADMIN)).toBe(false);
  });

  it('evaluates Viewer permissions correctly (strictly read-only)', () => {
    const viewer = { id: 'vw_1', role: 'viewer' };

    expect(hasPermission(viewer, PERMISSIONS.DASHBOARD_VIEW)).toBe(true);
    expect(hasPermission(viewer, PERMISSIONS.SUBSCRIPTION_READ)).toBe(true);
    expect(hasPermission(viewer, PERMISSIONS.SUBSCRIPTION_CREATE)).toBe(false);
    expect(hasPermission(viewer, PERMISSIONS.SUBSCRIPTION_DELETE)).toBe(false);
    expect(hasPermission(viewer, PERMISSIONS.TOKEN_CREATE)).toBe(false);
  });
});
