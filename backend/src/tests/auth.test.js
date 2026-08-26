const { describe, it } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ROLES, PERMISSIONS, normalizeRole, hasPermission } = require('../config/rbac');

describe('Backend Auth & RBAC Security Suite', () => {
  it('hashes and compares passwords securely with bcrypt', async () => {
    const rawPassword = 'SecurePassword2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert.notStrictEqual(hash, rawPassword);
    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isMatch, true);

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isWrongMatch, false);
  });

  it('generates and verifies JWT tokens with payload integrity', () => {
    const secret = 'test-jwt-secret-key-12345';
    const payload = {
      id: 'usr_mock_123',
      role: ROLES.SUPER_ADMIN,
      email: 'admin@kbzbank.com'
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    assert.strictEqual(typeof token, 'string');

    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.id, payload.id);
    assert.strictEqual(decoded.role, payload.role);
    assert.strictEqual(decoded.email, payload.email);
  });

  it('normalizes roles in backend canonical evaluator', () => {
    assert.strictEqual(normalizeRole('super_admin'), ROLES.SUPER_ADMIN);
    assert.strictEqual(normalizeRole('admin'), ROLES.ADMIN);
    assert.strictEqual(normalizeRole('head_of_brand'), ROLES.HEAD_BRAND);
    assert.strictEqual(normalizeRole('procurement'), ROLES.PROCUREMENT_OFFICER);
    assert.strictEqual(normalizeRole('viewer'), ROLES.VIEWER);
  });

  it('enforces RBAC permission boundaries', () => {
    const superAdmin = { id: 'sa_1', role: ROLES.SUPER_ADMIN };
    const viewer = { id: 'vw_1', role: ROLES.VIEWER };

    assert.strictEqual(hasPermission(superAdmin, PERMISSIONS.DATA_RESET), true);
    assert.strictEqual(hasPermission(viewer, PERMISSIONS.SUBSCRIPTION_CREATE), false);
    assert.strictEqual(hasPermission(viewer, PERMISSIONS.DASHBOARD_VIEW), true);
  });
});
