'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNotification } from '@/components/NotificationContext';

export interface AuthUser {
  userId: string;
  username: string; // holds the full email address
  emailPrefix: string; // holds the prefix of the email (e.g. 'pratikmak8369')
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  // Initialize session: clear any stale session data on mount so the login gate is always shown fresh.
  // NOTE: Empty dep array is intentional — this runs exactly once on mount. showNotification is
  // excluded to prevent re-triggering this reset every time a notification renders.
  useEffect(() => {
    try {
      setUser(null);
      setToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('activeEcoUser');
        localStorage.removeItem('eco_session_token');
        document.cookie = 'eco_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      }
    } catch (err) {
      console.error('Auth session initialization failed:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser({
            userId: data.user.userId,
            username: data.user.username,
            emailPrefix: data.user.username.split('@')[0]
          });
          setToken(data.token);
          localStorage.setItem('eco_session_token', data.token);
          localStorage.setItem('activeEcoUser', email);
          document.cookie = `eco_session=${data.token}; path=/; max-age=604800; SameSite=Strict; Secure`;
          setLoading(false);
          showNotification("Authenticated successfully as User " + email, 'success');
          return true;
        }
      }
      setLoading(false);
      showNotification('Failed to establish user session', 'error');
      return false;
    } catch (err) {
      console.error("Login failed:", err);
      setLoading(false);
      showNotification('Failed to establish user session', 'error');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('eco_session_token');
    localStorage.removeItem('activeEcoUser');
    document.cookie = 'eco_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    showNotification('Logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
