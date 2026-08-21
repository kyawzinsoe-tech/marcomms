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

  const value = {
    user,
    role: user?.role || null,
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user',
    isAuthenticated: !!user,
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
