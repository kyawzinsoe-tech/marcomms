import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, loginUser, logoutUser } from '../services/authService';

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

  const login = useCallback(async (email, password) => {
    const sessionUser = await loginUser(email, password);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer' || user?.role === 'user';

  // Role-Based Access Control (RBAC) permission resolver
  const can = useCallback(
    (action) => {
      if (!user) return false;
      if (isAdmin) return true; // Admin has full access to all capabilities

      // Viewer permissions (Read-only access)
      switch (action) {
        case 'view_dashboard':
        case 'view_subscriptions':
        case 'view_tokens':
        case 'view_trends':
        case 'export_data':
        case 'print_report':
          return true;
        case 'manage_users':
        case 'create_user':
        case 'edit_user':
        case 'delete_user':
        case 'create_subscription':
        case 'edit_subscription':
        case 'delete_subscription':
        case 'archive_subscription':
        case 'create_token':
        case 'edit_token':
        case 'delete_token':
        case 'archive_token':
        case 'send_reminder':
        case 'import_data':
        case 'reset_data':
          return false;
        default:
          return false;
      }
    },
    [user, isAdmin]
  );

  const value = {
    user,
    role: isAdmin ? 'admin' : (isViewer ? 'viewer' : null),
    isAdmin,
    isViewer,
    can,
    isAuthenticated: !!user,
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
