import { getAuthToken } from './authService';

/**
 * Fetch list of active sessions from the server
 * Super Admin receives all active sessions; regular users receive their own.
 * @returns {Promise<Array>} Array of active session objects
 */
export async function fetchSessions() {
  const token = getAuthToken();
  if (!token) {
    return [];
  }

  try {
    const res = await fetch('/api/sessions', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data.sessions) ? data.sessions : [];
  } catch (err) {
    console.warn('[Session Service] Failed to fetch active sessions:', err.message);
    return [];
  }
}

/**
 * Revoke a specific active session by ID
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function revokeSession(sessionId) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required.');
  }

  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to terminate session.');
  }

  return data;
}

/**
 * Terminate all active sessions for a user (Super Admin only)
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function revokeAllUserSessions(userId) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required.');
  }

  const res = await fetch(`/api/sessions/user/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to terminate user sessions.');
  }

  return data;
}
