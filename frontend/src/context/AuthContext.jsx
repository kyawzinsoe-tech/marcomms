import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, loginUser, logoutUser } from '../services/authService';
import { ROLES, normalizeRole, hasPermission } from '../config/rbac';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existing = getCurrentUser();
    if (existing) {
      setUser(existing);
    }
    setLoading(false);
  }, []);

  // Listen for decoupled session expiration events (e.g. 401 Unauthorized from API calls)
  useEffect(() => {
    const handleSessionExpired = (e) => {
      logoutUser();
      setUser(null);
      if (typeof window !== 'undefined' && e?.detail?.message) {
        console.warn('[Session Expiry]', e.detail.message);
      }
    };

    window.addEventListener('marcomms:session-expired', handleSessionExpired);
    return () => window.removeEventListener('marcomms:session-expired', handleSessionExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const sessionUser = await loginUser(email, password);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  const currentRole = user ? normalizeRole(user.role) : null;
  const isSuperAdmin = currentRole === ROLES.SUPER_ADMIN;
  const isAdmin = currentRole === ROLES.SUPER_ADMIN || currentRole === ROLES.ADMIN;
  const isViewer = currentRole === ROLES.VIEWER;

  // Granular Single-Source-of-Truth RBAC permission evaluator
  const can = useCallback(
    (permission, target = null, context = {}) => {
      if (!user) return false;
      return hasPermission(user, permission, target, context);
    },
    [user]
  );

  const value = {
    user,
    role: currentRole,
    isSuperAdmin,
    isAdmin,
    isViewer,
    can,
    hasPermission: can,
    isAuthenticated: !!user,
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
