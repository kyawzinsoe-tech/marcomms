/**
 * Structured Security Audit Logger
 * Formats and records immutable audit log events for privileged administrative operations.
 * Redacts sensitive fields and contains logging failures safely.
 */

const REDACTED_KEYS = new Set(['password', 'token', 'secret', 'authorization', 'cookie', 'jwt']);

function sanitizeMetadata(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeMetadata(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function formatAuditLog({
  actorId = 'anonymous',
  actorRole = 'unknown',
  action,
  targetEntity = 'system',
  targetId = null,
  ip = '127.0.0.1',
  outcome = 'SUCCESS',
  metadata = {}
}) {
  return {
    timestamp: new Date().toISOString(),
    category: 'SECURITY_AUDIT',
    actor: {
      id: String(actorId || 'anonymous'),
      role: String(actorRole || 'unknown')
    },
    action: String(action || 'UNKNOWN_ACTION'),
    target: {
      entity: String(targetEntity || 'system'),
      id: targetId ? String(targetId) : null
    },
    clientIp: String(ip || '127.0.0.1'),
    outcome: String(outcome || 'SUCCESS').toUpperCase(),
    metadata: sanitizeMetadata(metadata)
  };
}

function logAuditEvent(params) {
  try {
    const logEntry = formatAuditLog(params || {});
    const jsonString = JSON.stringify(logEntry);

    if (logEntry.outcome === 'FAILURE') {
      console.warn(`[AUDIT_LOG_ALERT] ${jsonString}`);
    } else {
      console.log(`[AUDIT_LOG] ${jsonString}`);
    }

    return logEntry;
  } catch (err) {
    console.error('[AUDIT_LOGGER_INTERNAL_ERROR]', err?.message);
    return null;
  }
}

module.exports = {
  formatAuditLog,
  logAuditEvent,
  sanitizeMetadata
};
