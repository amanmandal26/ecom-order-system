import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';

const BASE_URL  = 'http://localhost:8080';
const AuthContext = createContext(null);

// Decodes a JWT payload without verifying the signature (browser-side check only).
// We use this to detect expiry before making API calls — avoids a wasted round trip.
function parseJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // convert to ms
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);

  // ── Startup: restore session ────────────────────────────────────────────────
  // On first render, check localStorage. If the access token is still valid,
  // restore the session immediately. If it has expired but a refresh token exists,
  // silently exchange it for a new access token so the user never sees a login page.
  useEffect(() => {
    const savedToken        = localStorage.getItem('token');
    const savedUser         = localStorage.getItem('user');
    const savedRefreshToken = localStorage.getItem('refreshToken');

    if (!savedToken || !savedUser) return;

    const expiry = parseJwtExpiry(savedToken);
    const isExpired = expiry === null || expiry < Date.now();

    if (!isExpired) {
      // Access token is still valid — restore session directly
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else if (savedRefreshToken) {
      // Access token expired but we have a refresh token — try a silent refresh.
      // Use plain axios (not `api`) so we don't trigger the response interceptor loop.
      axios
        .post(`${BASE_URL}/api/auth/refresh`, { refreshToken: savedRefreshToken })
        .then(({ data }) => {
          const { accessToken, refreshToken: newRefreshToken } = data.data;
          localStorage.setItem('token',        accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          setToken(accessToken);
          setUser(JSON.parse(savedUser));
        })
        .catch(() => {
          // Refresh failed (expired or revoked) — clear everything, stay on current page.
          // The next protected API call will redirect to /login via the response interceptor.
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        });
    } else {
      // Expired token with no refresh token — wipe storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  // ── login ────────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const authData = response.data.data;

    localStorage.setItem('token',        authData.token);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('user', JSON.stringify({
      email: authData.email,
      name:  authData.name,
      role:  authData.role,
    }));

    setToken(authData.token);
    setUser({ email: authData.email, name: authData.name, role: authData.role });
    return authData;
  };

  // ── register ─────────────────────────────────────────────────────────────────
  const register = async (name, email, password) => {
    await api.post('/api/auth/register', { name, email, password });
  };

  // ── logout ───────────────────────────────────────────────────────────────────
  // Sends the refresh token to the server for deletion, then clears local storage.
  // We clear local state immediately (fire-and-forget) so the UI responds instantly
  // even if the network call is slow. If the API call fails, the refresh token will
  // expire on its own after 30 days — no security issue.
  const logout = () => {
    const savedRefreshToken = localStorage.getItem('refreshToken');
    if (savedRefreshToken) {
      api.post('/api/auth/logout', { refreshToken: savedRefreshToken }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
