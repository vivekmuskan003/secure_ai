/**
 * context/AuthContext.jsx — Local JWT-based authentication context
 *
 * Manages the user's session using a JWT stored in localStorage.
 * Works independently of Auth0 (Auth0 is kept for Google OAuth only).
 *
 * Provides: isAuthenticated, user, token, login(), logout()
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

/**
 * Decode JWT payload without verifying signature
 * (verification happens on the backend)
 */
const decodeJWT = (token) => {
  try {
    const base64 = token.split('.')[1];
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isTokenExpired = (decoded) => {
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 < Date.now();
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('auth_token');
    if (!t) return null;
    const decoded = decodeJWT(t);
    if (!decoded || isTokenExpired(decoded)) {
      localStorage.removeItem('auth_token');
      return null;
    }
    return decoded;
  });

  const isAuthenticated = !!token && !!user && !isTokenExpired(user);

  // Save token and decode user
  const login = useCallback((newToken) => {
    const decoded = decodeJWT(newToken);
    if (!decoded || isTokenExpired(decoded)) {
      console.error('[Auth] Received invalid or expired token');
      return;
    }
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('connectedServices');
    setToken(null);
    setUser(null);
  }, []);

  const getToken = useCallback(() => token, [token]);

  // Auto-logout when token expires
  useEffect(() => {
    if (!user?.exp) return;
    const msUntilExpiry = user.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) { logout(); return; }
    const timer = setTimeout(logout, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
