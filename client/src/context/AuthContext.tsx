import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const saved = localStorage.getItem('cashflow_admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('cashflow_token');
      if (!token) {
        setAdmin(null);
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setAdmin(res.data.admin);
          localStorage.setItem('cashflow_admin', JSON.stringify(res.data.admin));
        }
      } catch {
        localStorage.removeItem('cashflow_token');
        localStorage.removeItem('cashflow_admin');
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };
    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('cashflow_token', res.data.token);
        localStorage.setItem('cashflow_admin', JSON.stringify(res.data.admin));
        setAdmin(res.data.admin);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('cashflow_token');
      localStorage.removeItem('cashflow_admin');
      setAdmin(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
