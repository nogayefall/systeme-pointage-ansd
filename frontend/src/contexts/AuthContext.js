import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const response = await authAPI.me();
          setUser(response.data);
        } catch (err) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return userData;
    } catch (err) {
      const message = err.response?.data?.error || 'Erreur de connexion';
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Vérifier si l'utilisateur a une permission
  const hasPermission = (permissionName) => {
    if (!user) return false;
    return user?.permissions?.includes(permissionName) || false;
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isSuperAdmin: user?.roles?.includes('ROLE_SUPER_ADMIN'),
    isSecurityAgent: user?.roles?.includes('ROLE_SECURITY_AGENT'),
    isRHAdmin: user?.roles?.includes('ROLE_RH_ADMIN'),
    hasPermission,
    getUserRole: () => {
      if (user?.roles?.includes('ROLE_SUPER_ADMIN')) return 'SUPER_ADMIN';
      if (user?.roles?.includes('ROLE_SECURITY_AGENT')) return 'SECURITY_AGENT';
      if (user?.roles?.includes('ROLE_RH_ADMIN')) return 'RH_ADMIN';
      return 'AGENT';
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
