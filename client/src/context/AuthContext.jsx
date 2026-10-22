import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check current session on mount
  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('resolveiq_token');
      if (savedToken) {
        try {
          const res = await api.getCurrentUser();
          if (res?.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('resolveiq_token');
            setUser(null);
          }
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          localStorage.removeItem('resolveiq_token');
          setUser(null);
        }
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.token) {
      localStorage.setItem('resolveiq_token', res.token);
    }
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.token) {
      localStorage.setItem('resolveiq_token', res.token);
    }
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('resolveiq_token');
    setUser(null);
  };

  // Demo Login Quick-Switcher (Manager, Agent, Customer)
  const demoLogin = async (roleType) => {
    const demoCredentials = {
      MANAGER: { email: 'manager@resolveiq.com', password: 'Manager@123' },
      AGENT: { email: 'agent.sarah@resolveiq.com', password: 'Agent@123' },
      CUSTOMER: { email: 'customer.john@example.com', password: 'Customer@123' }
    };

    const target = demoCredentials[roleType.toUpperCase()] || demoCredentials.MANAGER;
    return await login(target.email, target.password);
  };

  const refreshUser = async () => {
    try {
      const res = await api.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    role: user?.role || null,
    isManager: user?.role === 'MANAGER',
    isAgent: user?.role === 'AGENT',
    isCustomer: user?.role === 'CUSTOMER',
    login,
    register,
    logout,
    demoLogin,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
