const { describe, it } = require('node:test');
const assert = require('node:assert');
const { formatAuditLog, logAuditEvent, sanitizeMetadata } = require('../utils/auditLogger');

describe('Security Audit Logger Suite', () => {
  it('formats structured audit log entries correctly with ISO timestamp', () => {
    const entry = formatAuditLog({
      actorId: 'usr_admin_1',
      actorRole: 'super_admin',
      action: 'USER_DELETED',
      targetEntity: 'User',
      targetId: 'usr_target_99',
      ip: '192.168.1.100',
      outcome: 'SUCCESS',
      metadata: { reason: 'Decommissioned account' }
    });

    assert.strictEqual(entry.category, 'SECURITY_AUDIT');
    assert.strictEqual(entry.actor.id, 'usr_admin_1');
    assert.strictEqual(entry.actor.role, 'super_admin');
    assert.strictEqual(entry.action, 'USER_DELETED');
    assert.strictEqual(entry.target.entity, 'User');
    assert.strictEqual(entry.target.id, 'usr_target_99');
    assert.strictEqual(entry.clientIp, '192.168.1.100');
    assert.strictEqual(entry.outcome, 'SUCCESS');
    assert.strictEqual(entry.metadata.reason, 'Decommissioned account');
    assert.match(entry.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });

  it('redacts sensitive fields from metadata automatically', () => {
    const sanitized = sanitizeMetadata({
      password: 'SuperSecretPassword!',
      token: 'jwt.token.here',
      email: 'user@kbzbank.com',
      nested: {
        authorization: 'Bearer 12345',
        role: 'admin'
      }
    });

    assert.strictEqual(sanitized.password, '[REDACTED]');
    assert.strictEqual(sanitized.token, '[REDACTED]');
    assert.strictEqual(sanitized.email, 'user@kbzbank.com');
    assert.strictEqual(sanitized.nested.authorization, '[REDACTED]');
    assert.strictEqual(sanitized.nested.role, 'admin');
  });

  it('logs audit events and returns formatted log entry for SUCCESS and FAILURE', () => {
    const successEntry = logAuditEvent({
      actorId: 'sa_1',
      actorRole: 'super_admin',
      action: 'DATABASE_RESET_DEMO',
      outcome: 'SUCCESS'
    });
    assert.strictEqual(successEntry.outcome, 'SUCCESS');

    const failEntry = logAuditEvent({
      actorId: 'sa_1',
      actorRole: 'super_admin',
      action: 'DATABASE_RESTORE_FAIL',
      outcome: 'FAILURE',
      metadata: { error: 'Invalid backup signature' }
    });
    assert.strictEqual(failEntry.outcome, 'FAILURE');
  });

  it('handles null/empty parameters gracefully without crashing', () => {
    const result = logAuditEvent(null);
    assert.ok(result);
    assert.strictEqual(result.actor.id, 'anonymous');
    assert.strictEqual(result.action, 'UNKNOWN_ACTION');
  });
});
