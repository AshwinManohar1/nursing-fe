import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { login as loginApi, logout as logoutApi } from '../api';
import { decodeToken, isTokenExpired } from '../utils/jwt';

export interface User {
  id: string;
  employee_id: string;
  name: string;
  role: string;
  org_id: string;
  staff_id: string | null;
  status: string;
  ward_id: string[];
}

interface AuthContextType {
  user: User | null;
  login: (employee_id: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Re-derive user from token (e.g. after token refresh) */
  syncUserFromToken: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function userFromToken(token: string): User | null {
  const payload = decodeToken(token);
  if (!payload?.user_id || !payload?.role) return null;
  return {
    id: payload.user_id,
    employee_id: payload.employee_id || '',
    name: payload.name || payload.employee_id || 'User',
    role: payload.role,
    org_id: payload.org_id || '',
    staff_id: payload.staff_id ?? null,
    status: 'ACTIVE',
    ward_id: Array.isArray(payload.ward_id) ? payload.ward_id : [],
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncUserFromToken = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token || isTokenExpired(token)) {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return;
    }
    const derived = userFromToken(token);
    setUser(derived);
  }, []);

  useEffect(() => {
    // Derive user from token only - never trust stored user object
    const token = localStorage.getItem('access_token');
    if (!token || isTokenExpired(token)) {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } else {
      setUser(userFromToken(token));
    }
    setIsLoading(false);
  }, []);

  const login = async (employee_id: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await loginApi(employee_id, password);

      if (response.success && response.data?.access_token) {
        const token = response.data.access_token;
        localStorage.setItem('access_token', token);
        localStorage.setItem('refresh_token', response.data.refresh_token || '');

        // Derive user from token - never use response.data.role, org_id, ward_id, etc.
        const derived = userFromToken(token);
        if (derived) {
          setUser(derived);
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }

        setIsLoading(false);
        return !!derived;
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore - clear local state regardless
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated,
    syncUserFromToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
