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

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isViewer = user?.role === 'viewer' || user?.role === 'user' || (!isSuperAdmin && !isAdmin);

  // Granular Role-Based Access Control (RBAC) permission resolver
  const can = useCallback(
    (action, target = null) => {
      if (!user) return false;

      // 1. Super Admin: full unrestricted system access
      if (isSuperAdmin) {
        return true;
      }

      // 2. Admin: operational access + viewer user management
      if (isAdmin) {
        switch (action) {
          // System Operations
          case 'view_dashboard':
          case 'view_subscriptions':
          case 'view_tokens':
          case 'view_trends':
          case 'export_data':
          case 'print_report':
          case 'create_subscription':
          case 'edit_subscription':
          case 'delete_subscription':
          case 'archive_subscription':
          case 'create_token':
          case 'edit_token':
          case 'delete_token':
          case 'archive_token':
          case 'send_reminder':
            return true;

          // User Management Permissions for Admin
          case 'manage_users':
          case 'create_user':
          case 'create_viewer':
            return true;
          
          case 'create_super_admin':
          case 'create_admin':
          case 'assign_super_admin':
          case 'assign_admin':
          case 'manage_roles':
          case 'import_data':
          case 'reset_data':
            return false;

          case 'edit_user':
            // Admin can edit Viewer accounts, or edit self (without role change)
            if (!target) return true;
            if (target.role === 'super_admin') return false;
            if (target.role === 'admin' && String(target.id) !== String(user.id)) return false;
            return true;

          case 'delete_user':
            // Admin can only delete Viewer accounts
            if (!target) return false;
            if (target.role === 'super_admin' || target.role === 'admin') return false;
            return true;

          default:
            return false;
        }
      }

      // 3. Viewer: strictly read-only access
      switch (action) {
        case 'view_dashboard':
        case 'view_subscriptions':
        case 'view_tokens':
        case 'view_trends':
        case 'export_data':
        case 'print_report':
          return true;
        default:
          return false;
      }
    },
    [user, isSuperAdmin, isAdmin]
  );

  const value = {
    user,
    role: user?.role || null,
    isSuperAdmin,
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
